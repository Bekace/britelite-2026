import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { deviceCode: string } }) {
  try {
    const { deviceCode } = params

    console.log("[v0] Device config request:", { deviceCode })

    if (!deviceCode) {
      console.log("[v0] Device code missing")
      return NextResponse.json({ error: "Device code is required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      console.log("[v0] Supabase client creation failed")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    console.log("[v0] Looking up device with code:", deviceCode)

    console.log("[v0] Device lookup query parameters:", {
      device_code: deviceCode,
      is_paired: true,
    })

    // Find device by device code
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", deviceCode)
      .eq("is_paired", true)
      .single()

    console.log("[v0] Device lookup result:", { device, deviceError })

    if (deviceError || !device) {
      console.log("[v0] Device not found with is_paired=true, checking if device exists at all...")

      const { data: anyDevice, error: anyDeviceError } = await supabase
        .from("devices")
        .select("*")
        .eq("device_code", deviceCode)
        .single()

      console.log("[v0] Device lookup without pairing filter:", { anyDevice, anyDeviceError })

      if (anyDevice) {
        console.log("[v0] Device exists but is_paired =", anyDevice.is_paired, "screen_id =", anyDevice.screen_id)
      }
    }

    if (deviceError || !device) {
      console.log("[v0] Device not found or not paired:", deviceError)
      return NextResponse.json({ error: "Device not found or not paired" }, { status: 404 })
    }

    console.log("[v0] Looking up screen with ID:", device.screen_id)

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

    console.log("[v0] Screen lookup result:", { screen, screenError })

    if (screenError || !screen) {
      console.log("[v0] Screen not found:", screenError)
      return NextResponse.json({ error: "Screen configuration not found" }, { status: 404 })
    }

    const activePlaylist = screen.screen_playlists?.find((sp: any) => sp.is_active)?.playlists || null
    console.log("[v0] Active playlist found:", activePlaylist)

    let playlistContent = null

    if (activePlaylist) {
      console.log("[v0] Fetching playlist content for:", activePlaylist.id)

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

      console.log("[v0] Playlist content result:", { content, contentError })

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
