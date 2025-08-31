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
      .single()

    if (deviceError || !device) {
      console.error("[v0] Device not found:", deviceError)
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    if (!device.screen_id) {
      console.error("[v0] Device not paired to screen:", deviceCode)
      return NextResponse.json({ error: "Device not paired to screen" }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from("devices")
      .update({
        is_paired: true,
        last_heartbeat: new Date().toISOString(),
      })
      .eq("id", device.id)

    if (updateError) {
      console.error("[v0] Failed to update device:", updateError)
    }

    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select(`
        id,
        name,
        orientation,
        status,
        screen_playlists!inner (
          playlist_id,
          is_active,
          playlists (
            id,
            name,
            background_color
          )
        )
      `)
      .eq("id", device.screen_id)
      .eq("screen_playlists.is_active", true)
      .single()

    if (screenError || !screen) {
      console.error("[v0] Screen not found:", screenError)
      return NextResponse.json({ error: "Screen configuration not found" }, { status: 404 })
    }

    const activePlaylist = screen.screen_playlists?.[0]?.playlists
    let playlistContent = []

    if (activePlaylist) {
      const { data: content, error: contentError } = await supabase
        .from("playlist_items")
        .select(`
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
        `)
        .eq("playlist_id", activePlaylist.id)
        .order("position")

      if (!contentError && content) {
        playlistContent = content
      }
    }

    const response = NextResponse.json({
      device: {
        id: device.id,
        device_code: device.device_code,
        is_paired: device.is_paired,
        screen_id: device.screen_id,
      },
      screen: {
        id: screen.id,
        name: screen.name,
        orientation: screen.orientation,
        status: screen.status,
        playlist: activePlaylist,
        content: playlistContent,
      },
    })

    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  } catch (error) {
    console.error("[v0] Device config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
