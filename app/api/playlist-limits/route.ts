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

    console.log("[v0] User ID:", user.id) // Added user ID logging

    // Get user's current playlist count
    const { count: currentCount, error: countError } = await supabase
      .from("playlists")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (countError) {
      console.error("Error counting playlists:", countError)
      return NextResponse.json({ error: "Failed to count playlists" }, { status: 500 })
    }

    console.log("[v0] Current playlist count:", currentCount) // Added playlist count logging

    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select(`
        *,
        user_subscriptions!left(
          status,
          plan_id,
          subscription_plans!inner(
            name,
            max_playlists
          )
        )
      `)
      .eq("id", user.id)
      .single()

    console.log("[v0] User data query result:", { userData, userError })

    if (userError) {
      console.error("Error fetching user data:", userError)
      console.log("[v0] Falling back to Free plan due to user data error")
      const { data: freePlan, error: freePlanError } = await supabase
        .from("subscription_plans")
        .select("max_playlists")
        .ilike("name", "%free%")
        .eq("is_active", true)
        .single()

      console.log("[v0] Free plan fallback result:", { freePlan, freePlanError })

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

    const userSubscription = userData?.user_subscriptions
    console.log("[v0] User subscription data:", userSubscription)

    if (userSubscription?.status === "active" && userSubscription?.subscription_plans?.max_playlists !== undefined) {
      // User has active subscription with valid plan
      maxPlaylists = userSubscription.subscription_plans.max_playlists
      console.log("[v0] Using active subscription max_playlists:", maxPlaylists)
    } else {
      console.log("[v0] No active subscription found, falling back to Free plan")
      const { data: freePlan, error: freePlanError } = await supabase
        .from("subscription_plans")
        .select("max_playlists")
        .ilike("name", "%free%")
        .eq("is_active", true)
        .single()

      console.log("[v0] Free plan query result:", { freePlan, freePlanError })

      if (freePlanError || !freePlan) {
        console.error("Error fetching Free plan:", freePlanError)
        return NextResponse.json({ error: "Failed to determine playlist limits" }, { status: 500 })
      }

      maxPlaylists = freePlan.max_playlists
      console.log("[v0] Using Free plan max_playlists:", maxPlaylists)
    }

    const canCreate = maxPlaylists === -1 || (currentCount || 0) < maxPlaylists

    console.log("[v0] Playlist limits calculated:", {
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
      hasSubscription: userSubscription?.status === "active",
    })

    return NextResponse.json({
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
    })
  } catch (error) {
    console.error("Error checking playlist limits:", error)
    console.log("[v0] Exception occurred, falling back to Free plan")
    try {
      const supabase = await createClient()
      const { data: freePlan, error: freePlanError } = await supabase
        .from("subscription_plans")
        .select("max_playlists")
        .ilike("name", "%free%")
        .eq("is_active", true)
        .single()

      console.log("[v0] Exception fallback Free plan result:", { freePlan, freePlanError }) // Added exception fallback logging

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
