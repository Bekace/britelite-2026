import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get("time_range") || "7d"

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

    // Get all screens for this user with their devices
    const { data: screens, error: screensError } = await supabase
      .from("screens")
      .select("id, name, devices(id, is_online, last_heartbeat)")
      .eq("user_id", user.id)

    if (screensError) {
      return NextResponse.json({ error: screensError.message }, { status: 500 })
    }

    if (!screens || screens.length === 0) {
      return NextResponse.json({ screens: [] })
    }

    const screenIds = screens.map((s) => s.id)

    // Batch fetch all events for all screens in the time range
    const { data: allEvents } = await supabase
      .from("device_events")
      .select("screen_id, event_type, created_at")
      .in("screen_id", screenIds)
      .gte("created_at", startDate.toISOString())

    // Batch fetch all heartbeats for all screens in the time range
    const { data: allHeartbeats } = await supabase
      .from("screen_heartbeats")
      .select("screen_id, status, created_at")
      .in("screen_id", screenIds)
      .gte("created_at", startDate.toISOString())

    // Calculate metrics per screen
    const days = timeRange === "24h" ? 1 : timeRange === "7d" ? 7 : 30

    const screenMetrics = screens.map((screen) => {
      const screenEvents = (allEvents || []).filter((e) => e.screen_id === screen.id)
      const screenHeartbeats = (allHeartbeats || []).filter((h) => h.screen_id === screen.id)

      const totalPlays = screenEvents.filter((e) => e.event_type === "media_start").length
      const completedPlays = screenEvents.filter((e) => e.event_type === "media_end").length
      const engagementRate = totalPlays > 0 ? Math.round((completedPlays / totalPlays) * 100) : 0

      // Uptime: ratio of online heartbeats to total heartbeats
      const totalHeartbeats = screenHeartbeats.length
      const onlineHeartbeats = screenHeartbeats.filter((h) => h.status === "online").length
      const uptimePercent = totalHeartbeats > 0 ? Math.round((onlineHeartbeats / totalHeartbeats) * 100) : 0

      // 7-day trend: plays per day (for sparkline)
      const trend = Array.from({ length: days }, (_, i) => {
        const day = new Date(now)
        day.setDate(day.getDate() - (days - 1 - i))
        const dayStart = new Date(day.setHours(0, 0, 0, 0)).toISOString()
        const dayEnd = new Date(day.setHours(23, 59, 59, 999)).toISOString()
        return screenEvents.filter(
          (e) =>
            e.event_type === "media_start" &&
            e.created_at >= dayStart &&
            e.created_at <= dayEnd
        ).length
      })

      // Determine online status from device
      const devices = Array.isArray(screen.devices) ? screen.devices : screen.devices ? [screen.devices] : []
      const isOnline = devices.some((d: any) => d.is_online)

      return {
        screen_id: screen.id,
        screen_name: screen.name,
        is_online: isOnline,
        total_plays: totalPlays,
        engagement_rate: engagementRate,
        uptime_percent: uptimePercent,
        trend,
        has_real_data: totalHeartbeats > 0 || totalPlays > 0,
      }
    })

    return NextResponse.json({ screens: screenMetrics, time_range: timeRange })
  } catch (error: any) {
    console.error("[v0] Error in analytics/screens:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
