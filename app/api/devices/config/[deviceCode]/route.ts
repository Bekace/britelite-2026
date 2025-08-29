import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { deviceCode: string } }) {
  try {
    const { deviceCode } = params

    console.log("[v0] === DEVICE CONFIG REQUEST START ===")
    console.log("[v0] Device config request:", { deviceCode, timestamp: new Date().toISOString() })

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

    const { data: allDevices, error: allDevicesError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", deviceCode)

    console.log("[v0] All devices query result:", {
      count: allDevices?.length || 0,
      devices: allDevices,
      error: allDevicesError,
    })

    if (allDevicesError) {
      console.log("[v0] Database error during device lookup:", allDevicesError)
      return NextResponse.json({ error: "Database query failed" }, { status: 500 })
    }

    if (!allDevices || allDevices.length === 0) {
      console.log("[v0] No device found with code:", deviceCode)
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    const pairedDevice = allDevices.find((d) => d.is_paired === true)

    console.log("[v0] Device analysis:", {
      totalDevices: allDevices.length,
      pairedDevice: pairedDevice
        ? {
            id: pairedDevice.id,
            is_paired: pairedDevice.is_paired,
            screen_id: pairedDevice.screen_id,
            user_id: pairedDevice.user_id,
            last_heartbeat: pairedDevice.last_heartbeat,
          }
        : null,
      allDevicesStatus: allDevices.map((d) => ({
        id: d.id,
        is_paired: d.is_paired,
        screen_id: d.screen_id,
        user_id: d.user_id,
      })),
    })

    if (!pairedDevice) {
      console.log(
        "[v0] Device found but not paired. Device states:",
        allDevices.map((d) => ({ is_paired: d.is_paired, screen_id: d.screen_id })),
      )
      return NextResponse.json({ error: "Device not paired to any screen" }, { status: 404 })
    }

    const device = pairedDevice
    console.log("[v0] Using paired device:", { id: device.id, screen_id: device.screen_id })

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

      console.log("[v0] Playlist content result:", { content, contentError })

      if (!contentError && content) {
        playlistContent = content
      }
    }

    console.log("[v0] Device config retrieved successfully")

    console.log("[v0] === DEVICE CONFIG REQUEST END ===")

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
