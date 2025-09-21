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

    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select(`
        *,
        user_subscriptions!inner(
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
      // Default to basic limits if we can't fetch user data (no subscription)
      return NextResponse.json({
        maxPlaylists: 5, // Default limit for users without subscription
        currentCount: currentCount || 0,
        canCreate: (currentCount || 0) < 5,
      })
    }

    const maxPlaylists = userData?.user_subscriptions?.subscription_plans?.max_playlists ?? 5
    const canCreate = maxPlaylists === -1 || (currentCount || 0) < maxPlaylists

    return NextResponse.json({
      maxPlaylists,
      currentCount: currentCount || 0,
      canCreate,
    })
  } catch (error) {
    console.error("Error checking playlist limits:", error)
    // Default to basic limits on error
    return NextResponse.json({
      maxPlaylists: 5,
      currentCount: 0,
      canCreate: true,
    })
  }
}
