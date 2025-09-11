import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile with current usage stats
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
    }

    // Get current user subscription and plan
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select(`
        *,
        subscription_plans (*)
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single()

    // Get total views from analytics (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: totalViews } = await supabase
      .from("analytics")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "media_view")
      .gte("created_at", thirtyDaysAgo.toISOString())

    // Calculate storage in MB
    const storageUsedMB = Math.round((profile.current_storage_used_mb || 0) / (1024 * 1024))

    return NextResponse.json({
      activeScreens: profile.current_screens_count || 0,
      storageUsedMB: storageUsedMB,
      activePlaylists: profile.current_playlists_count || 0,
      totalViews: totalViews || 0,
      currentPlan: subscription?.subscription_plans || null,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
