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
    }

    let maxPlaylists: number

    if (userData?.role === "super_admin") {
      console.log("[v0] User is super admin, granting unlimited playlists")
      maxPlaylists = -1
    } else {
      const userSubscription = userData?.user_subscriptions
      console.log("[v0] User subscription data:", userSubscription)

      if (Array.isArray(userSubscription) && userSubscription.length > 0) {
        const activeSubscription = userSubscription.find((sub) => sub.status === "active")
        if (activeSubscription?.subscription_plans?.max_playlists !== undefined) {
          maxPlaylists = activeSubscription.subscription_plans.max_playlists
          console.log("[v0] Using active subscription max_playlists:", maxPlaylists)
        } else {
          console.log("[v0] No active subscription found in array, falling back to Free plan")
          maxPlaylists = await getFreePlanLimit(supabase)
        }
      } else if (userSubscription && !Array.isArray(userSubscription)) {
        // Handle case where it's a single object
        if (userSubscription.status === "active" && userSubscription.subscription_plans?.max_playlists !== undefined) {
          maxPlaylists = userSubscription.subscription_plans.max_playlists
          console.log("[v0] Using active subscription max_playlists:", maxPlaylists)
        } else {
          console.log("[v0] Subscription not active or missing plan data, falling back to Free plan")
          maxPlaylists = await getFreePlanLimit(supabase)
        }
      } else {
        console.log("[v0] No subscription found, falling back to Free plan")
        maxPlaylists = await getFreePlanLimit(supabase)
      }
    }

    const canCreate = maxPlaylists === -1 || (currentCount || 0) < maxPlaylists

    console.log("[v0] Playlist limits calculated:", {
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
      hasSubscription: !!userData?.user_subscriptions,
    })

    return NextResponse.json({
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
    })
  } catch (error) {
    console.error("Error checking playlist limits:", error)
    return NextResponse.json({ error: "Failed to check playlist limits" }, { status: 500 })
  }
}

async function getFreePlanLimit(supabase: any): Promise<number> {
  try {
    let { data: freePlan, error: freePlanError } = await supabase
      .from("subscription_plans")
      .select("max_playlists, name")
      .eq("name", "Free")
      .eq("is_active", true)
      .maybeSingle()

    console.log("[v0] Free plan exact match result:", { freePlan, freePlanError })

    if (!freePlan && !freePlanError) {
      const { data: allPlans, error: allPlansError } = await supabase
        .from("subscription_plans")
        .select("max_playlists, name")
        .eq("is_active", true)

      console.log("[v0] All active plans:", { allPlans, allPlansError })

      if (allPlans && allPlans.length > 0) {
        freePlan = allPlans.reduce((min, plan) => (plan.max_playlists < min.max_playlists ? plan : min))
        console.log("[v0] Using plan with lowest max_playlists as Free plan:", freePlan)
      }
    }

    if (freePlanError) {
      console.error("Error fetching Free plan:", freePlanError)
      throw new Error("Failed to fetch Free plan from database")
    }

    if (!freePlan) {
      console.error("[v0] No Free plan found in database")
      throw new Error("No Free plan found in database")
    }

    console.log("[v0] Using Free plan max_playlists from database:", freePlan.max_playlists)
    return freePlan.max_playlists
  } catch (error) {
    console.error("Exception in getFreePlanLimit:", error)
    throw error // Don't use fallback, let the error bubble up
  }
}
