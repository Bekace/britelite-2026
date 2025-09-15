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

    if (userError) {
      // Default to Free plan if no subscription found
      return NextResponse.json({
        maxStorage: 100,
        storageUnit: "MB",
        currentStorageBytes: 0,
      })
    }

    const plan = userData.user_subscriptions?.[0]?.subscription_plans
    const maxStorage = plan?.max_media_storage || 100
    const storageUnit = plan?.storage_unit || "MB"

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
