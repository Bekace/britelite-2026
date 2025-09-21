import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
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

    // Get user's subscription plan limits
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(`
        subscription_plan_id,
        subscription_plans (
          max_playlists
        )
      `)
      .eq("id", user.id)
      .single()

    if (userError) {
      console.error("Error fetching user data:", userError)
      // Default to unlimited if we can't fetch user data
      return NextResponse.json({
        maxPlaylists: -1,
        currentCount: currentCount || 0,
        canCreate: true,
      })
    }

    const maxPlaylists = userData?.subscription_plans?.max_playlists ?? -1
    const canCreate = maxPlaylists === -1 || (currentCount || 0) < maxPlaylists

    return NextResponse.json({
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
    })
  } catch (error) {
    console.error("Error checking playlist limits:", error)
    // Default to unlimited on error
    return NextResponse.json({
      maxPlaylists: -1,
      currentCount: 0,
      canCreate: true,
    })
  }
}
