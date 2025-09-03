import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { deviceCode: string } }) {
  try {
    const { deviceCode } = params

    if (!deviceCode) {
      return NextResponse.json({ error: "Device code is required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", deviceCode)
      .maybeSingle()

    if (deviceError || !device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    if (!device.screen_id) {
      return NextResponse.json({ error: "Device not paired to screen" }, { status: 404 })
    }

    const { data: screenData, error: screenError } = await supabase
      .from("screens")
      .select(`
        id,
        name,
        orientation,
        status,
        screen_playlists!inner (
          playlist_id,
          is_active,
          playlists!inner (
            id,
            name,
            background_color,
            is_active,
            playlist_items (
              id,
              position,
              duration_override,
              transition_type,
              transition_duration,
              media (
                id,
                name,
                file_path,
                mime_type,
                file_size,
                duration
              )
            )
          )
        )
      `)
      .eq("id", device.screen_id)
      .eq("screen_playlists.is_active", true)
      .eq("screen_playlists.playlists.is_active", true)
      .single()

    if (screenError || !screenData) {
      return NextResponse.json({ error: "Screen configuration not found" }, { status: 404 })
    }

    const activePlaylistData = screenData.screen_playlists?.[0]?.playlists
    const playlistContent = activePlaylistData?.playlist_items || []

    await supabase
      .from("devices")
      .update({
        is_paired: true,
        last_heartbeat: new Date().toISOString(),
      })
      .eq("id", device.id)

    const responseData = {
      device: {
        id: device.id,
        device_code: device.device_code,
        is_paired: true,
        screen_id: device.screen_id,
      },
      screen: {
        id: screenData.id,
        name: screenData.name,
        orientation: screenData.orientation,
        status: screenData.status,
        playlist: activePlaylistData || null,
        content: playlistContent,
      },
    }

    const response = NextResponse.json(responseData)
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  } catch (error) {
    console.error("Device config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
