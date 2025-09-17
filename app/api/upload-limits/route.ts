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

    console.log("[v0] Fetching user data for user ID:", user.id)

    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select(`
        *,
        user_subscriptions!inner(
          status,
          subscription_plans(
            max_media_storage,
            storage_unit
          )
        )
      `)
      .eq("id", user.id)
      .single()

    console.log("[v0] User data query result:", { userData, userError })

    if (userError) {
      console.log("[v0] No subscription found, using default values")
      return NextResponse.json({
        maxStorage: 1048576, // 1 MB in bytes
        storageUnit: "MB",
        currentStorageBytes: 0,
      })
    }

    const plan = userData.user_subscriptions?.subscription_plans
    console.log("[v0] Found subscription plan:", plan)

    const maxStorage = plan?.max_media_storage || 1048576 // Default to 1 MB in bytes
    const storageUnit = plan?.storage_unit || "MB"

    console.log("[v0] Using storage limits:", { maxStorage, storageUnit })

    // Calculate current storage usage
    const { data: mediaData, error: mediaError } = await supabase
      .from("media")
      .select("file_size")
      .eq("user_id", user.id)

    if (mediaError) {
      return NextResponse.json({ error: "Failed to calculate storage usage" }, { status: 500 })
    }

    const currentStorageBytes =
      mediaData?.reduce((total, item) => {
        const fileSize = item.file_size || 0
        return total + fileSize
      }, 0) || 0

    return NextResponse.json({
      maxStorage,
      storageUnit,
      currentStorageBytes,
    })
  } catch (error) {
    console.log("[v0] API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
