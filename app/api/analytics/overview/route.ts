import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("time_range") || "7d"

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Calculate time range
    const now = new Date()
    let startDate = new Date()
    
    switch (timeRange) {
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
    }

    // Get basic counts
    const [screensResult, mediaResult, playlistsResult, devicesResult] = await Promise.all([
      supabase.from("screens").select("id, name, location_id, locations(name)").eq("user_id", user.id),
      supabase.from("media").select("id, name, file_size").eq("user_id", user.id),
      supabase.from("playlists").select("id").eq("user_id", user.id).eq("is_active", true),
      supabase.from("devices").select("id, screen_id, is_online, last_heartbeat").eq("screens.user_id", user.id),
    ])

    const screens = screensResult.data || []
    const media = mediaResult.data || []
    const playlists = playlistsResult.data || []
    const devices = devicesResult.data || []

    // Calculate metrics
    const totalScreens = screens.length
    const onlineScreens = devices.filter((d) => d.is_online).length
    const totalMedia = media.length
    const totalStorage = media.reduce((sum, m) => sum + (m.file_size || 0), 0)
    const totalPlaylists = playlists.length

    // Get playback events for analytics
    const { data: playEvents } = await supabase
      .from("device_events")
      .select("*, screens!inner(user_id)")
      .eq("screens.user_id", user.id)
      .eq("event_type", "media_start")
      .gte("created_at", startDate.toISOString())

    const { data: completeEvents } = await supabase
      .from("device_events")
      .select("*, screens!inner(user_id)")
      .eq("screens.user_id", user.id)
      .eq("event_type", "media_end")
      .gte("created_at", startDate.toISOString())

    // Calculate 7-day trends
    const days = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30
    const last7Days = await Promise.all(
      Array.from({ length: days }, async (_, i) => {
        const date = new Date(now)
        date.setDate(date.getDate() - (days - 1 - i))
        const dayStart = new Date(date.setHours(0, 0, 0, 0))
        const dayEnd = new Date(date.setHours(23, 59, 59, 999))

        const { count: dayPlays } = await supabase
          .from("device_events")
          .select("*, screens!inner(user_id)", { count: "exact", head: true })
          .eq("screens.user_id", user.id)
          .eq("event_type", "media_start")
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString())

        const { data: uptimeData } = await supabase
          .rpc("calculate_uptime_percentage", {
            p_start_date: dayStart.toISOString(),
            p_end_date: dayEnd.toISOString()
          })

        return {
          date: dayStart.toISOString().split("T")[0],
          views: dayPlays || 0,
          engagement: 0,
          uptime: uptimeData || 0,
        }
      })
    )

    // Get screen performance using the view
    const { data: screenPerformanceData } = await supabase
      .from("screen_analytics")
      .select("*")

    const screenPerformance = screenPerformanceData?.map(sp => ({
      id: sp.screen_id,
      name: sp.screen_name,
      uptime: sp.uptime_percentage || 0,
      views: sp.total_plays || 0,
      engagement: sp.engagement_rate || 0,
    })) || []

    // Get top content
    const { data: topContentData } = await supabase
      .from("media_analytics")
      .select("*")
      .order("total_plays", { ascending: false })
      .limit(5)

    const contentPerformance = topContentData?.map(mc => ({
      id: mc.media_id,
      name: mc.media_name,
      views: mc.total_plays || 0,
      engagement: mc.engagement_rate || 0,
      duration: mc.avg_duration_played || 0,
    })) || []

    // Generate insights
    const insights = [
      {
        type: "screen",
        title: "Screen Utilization",
        description: `${onlineScreens} of ${totalScreens} screens are currently active. ${totalScreens - onlineScreens} screens may need attention.`,
        recommendation:
          onlineScreens < totalScreens
            ? "Check offline screens for connectivity issues."
            : "Great job maintaining all screens online!",
        impact: onlineScreens < totalScreens ? "high" : "low",
      },
      {
        type: "content",
        title: "Content Library",
        description: `You have ${totalMedia} media files using ${(totalStorage / (1024 * 1024)).toFixed(2)} MB of storage.`,
        recommendation: totalMedia > 0 ? "Review unused media to optimize storage." : "Add media content to get started.",
        impact: "medium",
      },
      {
        type: "performance",
        title: "Playback Performance",
        description: `${playEvents?.length || 0} media plays recorded in the last ${timeRange}.`,
        recommendation: playEvents && playEvents.length > 0 ? "Monitor engagement rates to optimize content." : "No playback data yet. Ensure devices are online and playing content.",
        impact: "medium",
      },
    ]

    return NextResponse.json({
      overview: {
        totalScreens,
        onlineScreens,
        totalMedia,
        totalStorage,
        totalPlaylists,
        uptimePercentage: totalScreens > 0 ? Math.floor((onlineScreens / totalScreens) * 100) : 0,
      },
      trends: last7Days,
      screenPerformance,
      contentPerformance,
      insights,
      time_range: timeRange,
    })
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
