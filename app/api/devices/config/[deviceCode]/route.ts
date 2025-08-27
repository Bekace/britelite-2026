import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { deviceCode: string } }) {
  try {
    const { deviceCode } = params

    console.log("[v0] Device config request:", { deviceCode })

    if (!deviceCode) {
      return NextResponse.json({ error: "Device code is required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Find device by device code
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", deviceCode)
      .eq("is_paired", true)
      .single()

    if (deviceError || !device) {
      console.log("[v0] Device not found or not paired:", deviceError)
      return NextResponse.json({ error: "Device not found or not paired" }, { status: 404 })
    }

    // Get screen configuration with playlist
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select(`
        id,
        name,
        orientation,
        status,
        screen_playlists (
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
      .single()

    if (screenError || !screen) {
      console.log("[v0] Screen not found:", screenError)
      return NextResponse.json({ error: "Screen configuration not found" }, { status: 404 })
    }

    // Get active playlist content
    const activePlaylist = screen.screen_playlists?.find((sp: any) => sp.is_active)?.playlists || null
    let playlistContent = null

    if (activePlaylist) {
      const { data: content, error: contentError } = await supabase
        .from("playlist_media")
        .select(`
          id,
          order_index,
          duration,
          transition_type,
          media (
            id,
            filename,
            file_path,
            file_type,
            file_size
          )
        `)
        .eq("playlist_id", activePlaylist.id)
        .order("order_index")

      if (!contentError && content) {
        playlistContent = content
      }
    }

    console.log("[v0] Device config retrieved successfully")

    return NextResponse.json({
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
  } catch (error) {
    console.error("[v0] Device config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
