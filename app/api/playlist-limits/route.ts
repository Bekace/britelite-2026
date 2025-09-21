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
        user_subscriptions!left(
          status,
          subscription_plans!inner(
            max_playlists
          )
        )
      `)
      .eq("id", user.id)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
      const { data: freePlan, error: freePlanError } = await supabase
        .from("subscription_plans")
        .select("max_playlists")
        .ilike("name", "%free%")
        .eq("is_active", true)
        .single()

      if (freePlanError || !freePlan) {
        console.error("Error fetching Free plan:", freePlanError)
        return NextResponse.json({ error: "Failed to determine playlist limits" }, { status: 500 })
      }

      return NextResponse.json({
        maxPlaylists: freePlan.max_playlists,
        currentCount: currentCount || 0,
        canCreate: (currentCount || 0) < freePlan.max_playlists,
      })
    }

    let maxPlaylists: number

    const activeSubscription = userData?.user_subscriptions?.find((sub: any) => sub.status === "active")

    if (activeSubscription?.subscription_plans?.max_playlists) {
      // User has active subscription with valid plan
      maxPlaylists = activeSubscription.subscription_plans.max_playlists
    } else {
      const { data: freePlan, error: freePlanError } = await supabase
        .from("subscription_plans")
        .select("max_playlists")
        .ilike("name", "%free%")
        .eq("is_active", true)
        .single()

      if (freePlanError || !freePlan) {
        console.error("Error fetching Free plan:", freePlanError)
        return NextResponse.json({ error: "Failed to determine playlist limits" }, { status: 500 })
      }

      maxPlaylists = freePlan.max_playlists
    }

    const canCreate = maxPlaylists === -1 || (currentCount || 0) < maxPlaylists

    console.log("[v0] Playlist limits calculated:", {
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
      hasSubscription: !!activeSubscription,
    })

    return NextResponse.json({
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
    })
  } catch (error) {
    console.error("Error checking playlist limits:", error)
    try {
      const supabase = await createClient()
      const { data: freePlan, error: freePlanError } = await supabase
        .from("subscription_plans")
        .select("max_playlists")
        .ilike("name", "%free%")
        .eq("is_active", true)
        .single()

      if (freePlan && !freePlanError) {
        return NextResponse.json({
          maxPlaylists: freePlan.max_playlists,
          currentCount: 0,
          canCreate: true,
        })
      }
    } catch (fallbackError) {
      console.error("Error in fallback Free plan fetch:", fallbackError)
    }

    return NextResponse.json({ error: "Failed to check playlist limits" }, { status: 500 })
  }
}
