import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { deviceCode: string } }) {
  try {
    const { deviceCode } = params
    console.log("[v0] === CONFIG API START ===")
    console.log("[v0] Requested device code:", deviceCode)

    if (!deviceCode) {
      return NextResponse.json({ error: "Device code is required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    console.log("[v0] Step 1: Looking for device...")
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", deviceCode)
      .maybeSingle()

    console.log("[v0] Device query result:", { device, error: deviceError })

    if (deviceError) {
      console.error("[v0] Device query error:", deviceError)
      return NextResponse.json({ error: "Database query failed" }, { status: 500 })
    }

    if (!device) {
      console.error("[v0] Device not found:", deviceCode)
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    console.log("[v0] Device found:", {
      id: device.id,
      device_code: device.device_code,
      is_paired: device.is_paired,
      screen_id: device.screen_id,
      user_id: device.user_id,
    })

    if (!device.screen_id) {
      console.error("[v0] Device not paired to screen:", deviceCode)
      return NextResponse.json({ error: "Device not paired to screen" }, { status: 404 })
    }

    console.log("[v0] Step 2: Looking for screen with ID:", device.screen_id)
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select(`
        id,
        name,
        orientation,
        status
      `)
      .eq("id", device.screen_id)
      .single()

    console.log("[v0] Screen query result:", { screen, error: screenError })

    if (screenError || !screen) {
      console.error("[v0] Screen not found for ID:", device.screen_id, "Error:", screenError)
      return NextResponse.json({ error: "Screen configuration not found" }, { status: 404 })
    }

    console.log("[v0] Screen found:", screen)

    console.log("[v0] Step 3: Looking for active playlist...")
    const { data: screenPlaylist, error: playlistError } = await supabase
      .from("screen_playlists")
      .select(`
        playlist_id,
        playlists (
          id,
          name,
          background_color
        )
      `)
      .eq("screen_id", device.screen_id)
      .eq("is_active", true)
      .maybeSingle()

    console.log("[v0] Playlist query result:", { screenPlaylist, error: playlistError })

    let activePlaylist = null
    let playlistContent = []

    if (!playlistError && screenPlaylist?.playlists) {
      activePlaylist = screenPlaylist.playlists
      console.log("[v0] Active playlist found:", activePlaylist)

      console.log("[v0] Step 4: Getting playlist content...")
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

      console.log("[v0] Content query result:", { content, error: contentError })

      if (!contentError && content) {
        playlistContent = content
        console.log("[v0] Found", content.length, "playlist items")
      }
    } else {
      console.log("[v0] No active playlist found for screen")
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

    const responseData = {
      device: {
        id: device.id,
        device_code: device.device_code,
        is_paired: true,
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
    }

    console.log("[v0] === CONFIG API SUCCESS ===")
    console.log("[v0] Returning config for device:", deviceCode)

    const response = NextResponse.json(responseData)

    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  } catch (error) {
    console.error("[v0] Device config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
