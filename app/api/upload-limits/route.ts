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
        user_subscriptions(
          status,
          plan_id,
          subscription_plans(
            max_media_storage,
            storage_unit
          )
        )
      `)
      .eq("id", user.id)
      .single()

    console.log("[v0] User data query result:", { userData, userError })

    let maxStorage = 1048576 // Default 1 MB in bytes
    let storageUnit = "MB"

    if (userData && userData.user_subscriptions && userData.user_subscriptions.length > 0) {
      const activeSubscription = userData.user_subscriptions.find((sub) => sub.status === "active")
      if (activeSubscription && activeSubscription.subscription_plans) {
        // User has an active subscription with valid plan
        const plan = activeSubscription.subscription_plans
        maxStorage = plan.max_media_storage
        storageUnit = plan.storage_unit || "MB"
        console.log("[v0] Using subscription plan storage:", { maxStorage, storageUnit })
      } else {
        console.log("[v0] Active subscription found but no plan data, fetching Free plan")
        // Fetch Free plan as fallback
        const { data: freePlan, error: freePlanError } = await supabase
          .from("subscription_plans")
          .select("max_media_storage, storage_unit, name")
          .eq("name", "Free")
          .eq("is_active", true)
          .single()

        if (freePlan && !freePlanError) {
          maxStorage = freePlan.max_media_storage
          storageUnit = freePlan.storage_unit || "MB"
          console.log("[v0] Using Free plan storage:", { maxStorage, storageUnit })
        }
      }
    } else {
      // User has no subscription - fetch Free plan
      console.log("[v0] No subscription found, fetching Free plan")

      const { data: freePlan, error: freePlanError } = await supabase
        .from("subscription_plans")
        .select("max_media_storage, storage_unit, name")
        .eq("name", "Free")
        .eq("is_active", true)
        .single()

      if (freePlan && !freePlanError) {
        maxStorage = freePlan.max_media_storage
        storageUnit = freePlan.storage_unit || "MB"
        console.log("[v0] Using Free plan storage:", { maxStorage, storageUnit })
      }
    }

    console.log("[v0] Final storage limits:", { maxStorage, storageUnit })

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
