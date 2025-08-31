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

    let device = null
    const { data: pairedDevice, error: pairedError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", deviceCode)
      .eq("is_paired", true)
      .not("screen_id", "is", null)
      .single()

    if (!pairedError && pairedDevice) {
      device = pairedDevice
    } else {
      const { data: unpairedDevice, error: unpairedError } = await supabase
        .from("devices")
        .select("*")
        .eq("device_code", deviceCode)
        .not("screen_id", "is", null)
        .single()

      if (unpairedDevice && !unpairedError) {
        const { error: updateError } = await supabase
          .from("devices")
          .update({ is_paired: true, last_heartbeat: new Date().toISOString() })
          .eq("id", unpairedDevice.id)

        if (!updateError) {
          // Use the fixed device
          device = { ...unpairedDevice, is_paired: true }
        } else {
          return NextResponse.json({ error: "Device not found or not paired" }, { status: 404 })
        }
      } else {
        return NextResponse.json({ error: "Device not found or not paired" }, { status: 404 })
      }
    }

    await supabase.from("devices").update({ last_heartbeat: new Date().toISOString() }).eq("id", device.id)

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
      return NextResponse.json({ error: "Screen configuration not found" }, { status: 404 })
    }

    const activePlaylist = screen.screen_playlists?.[0]?.playlists
    let playlistContent = null

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
