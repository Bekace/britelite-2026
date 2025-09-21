import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[v0] Fetching playlist limits...")
    const supabase = await createClient()

    if (!supabase) {
      console.error("Failed to create Supabase client")
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's current playlist count
    const { count: currentCount, error: countError } = await supabase
      .from("playlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (countError) {
      console.error("Error counting playlists:", countError)
      return NextResponse.json({ error: "Failed to count playlists" }, { status: 500 })
    }

    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select(`
        *,
        user_subscriptions(
          status,
          subscription_plans(
            max_playlists
          )
        )
      `)
      .eq("id", user.id)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("max_playlists")
        .ilike("name", "%free%")
        .eq("is_active", true)
        .single()

      const defaultLimit = freePlan?.max_playlists || 3
      return NextResponse.json({
        maxPlaylists: defaultLimit,
        currentCount: currentCount || 0,
        canCreate: (currentCount || 0) < defaultLimit,
      })
    }

    let maxPlaylists = 3 // Fallback if Free plan not found

    if (userData?.user_subscriptions && userData.user_subscriptions.length > 0) {
      // Find active subscription
      const activeSubscription = userData.user_subscriptions.find((sub: any) => sub.status === "active")

      if (activeSubscription?.subscription_plans?.max_playlists) {
        maxPlaylists = activeSubscription.subscription_plans.max_playlists
      } else {
        // User has subscription but no active plan - get Free plan limits
        const { data: freePlan } = await supabase
          .from("subscription_plans")
          .select("max_playlists")
          .ilike("name", "%free%")
          .eq("is_active", true)
          .single()

        maxPlaylists = freePlan?.max_playlists || 3
      }
    } else {
      // User has no subscription - get Free plan limits
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("max_playlists")
        .ilike("name", "%free%")
        .eq("is_active", true)
        .single()

      maxPlaylists = freePlan?.max_playlists || 3
    }

    const canCreate = maxPlaylists === -1 || (currentCount || 0) < maxPlaylists

    console.log("[v0] Playlist limits calculated:", {
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
      hasSubscription: !!userData?.user_subscriptions?.length,
    })

    return NextResponse.json({
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
    })
  } catch (error) {
    console.error("Error checking playlist limits:", error)
    const supabase = await createClient()
    const { data: freePlan } = await supabase
      .from("subscription_plans")
      .select("max_playlists")
      .ilike("name", "%free%")
      .eq("is_active", true)
      .single()

    const defaultLimit = freePlan?.max_playlists || 3
    return NextResponse.json({
      maxPlaylists: defaultLimit,
      currentCount: 0,
      canCreate: true,
    })
  }
}
