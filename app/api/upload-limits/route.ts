import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's subscription plan with storage limit
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select(`
        *,
        user_subscriptions!inner(
          status,
          subscription_plans(
            max_media_storage
          )
        )
      `)
      .eq("id", user.id)
      .single()

    if (userError) {
      console.error("User data error:", userError)
      // Default to Free plan if no subscription found
      return NextResponse.json({
        maxStorageGB: 1,
        currentStorageBytes: 0,
      })
    }

    const maxStorageBytes =
      userData.user_subscriptions?.[0]?.subscription_plans?.max_media_storage || 1 * 1024 * 1024 * 1024

    const maxStorageGB = maxStorageBytes === -1 ? -1 : Math.round(maxStorageBytes / (1024 * 1024 * 1024))

    // Calculate current storage usage
    const { data: mediaData, error: mediaError } = await supabase
      .from("media")
      .select("file_size")
      .eq("user_id", user.id)

    console.log("[v0] Media data query result:", { mediaData, mediaError })

    if (mediaError) {
      console.error("Media data error:", mediaError)
      return NextResponse.json({ error: "Failed to calculate storage usage" }, { status: 500 })
    }

    const currentStorageBytes =
      mediaData?.reduce((total, item) => {
        const fileSize = item.file_size || 0
        return total + fileSize
      }, 0) || 0

    console.log("[v0] Storage calculation:", {
      mediaCount: mediaData?.length || 0,
      currentStorageBytes,
      currentStorageGB: currentStorageBytes / (1024 * 1024 * 1024),
      maxStorageBytes,
      maxStorageGB,
    })

    return NextResponse.json({
      maxStorageGB,
      currentStorageBytes,
    })
  } catch (error) {
    console.error("Upload limits API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
