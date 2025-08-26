import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { deviceCode, screenId } = await request.json()

    console.log("[v0] Pairing request:", { deviceCode, screenId })

    if (!deviceCode || !screenId) {
      return NextResponse.json({ error: "Device code and screen ID are required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Find device by device code
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", deviceCode)
      .eq("user_id", user.id)
      .single()

    if (deviceError || !device) {
      console.log("[v0] Device not found:", deviceError)
      return NextResponse.json({ error: "Invalid device code" }, { status: 404 })
    }

    // Find screen by ID
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
      .eq("id", screenId)
      .eq("user_id", user.id)
      .single()

    if (screenError || !screen) {
      console.log("[v0] Screen not found:", screenError)
      return NextResponse.json({ error: "Invalid screen ID" }, { status: 404 })
    }

    // Update device to pair it with the screen
    const { error: updateError } = await supabase
      .from("devices")
      .update({
        is_paired: true,
        screen_id: screenId,
        last_heartbeat: new Date().toISOString(),
      })
      .eq("id", device.id)

    if (updateError) {
      console.log("[v0] Failed to update device:", updateError)
      return NextResponse.json({ error: "Failed to pair device" }, { status: 500 })
    }

    // Update screen status
    const { error: screenUpdateError } = await supabase
      .from("screens")
      .update({
        status: "online",
        last_seen: new Date().toISOString(),
      })
      .eq("id", screenId)

    if (screenUpdateError) {
      console.log("[v0] Failed to update screen:", screenUpdateError)
    }

    const activePlaylist = screen.screen_playlists?.find((sp: any) => sp.is_active)?.playlists || null

    console.log("[v0] Device paired successfully")

    // Return screen configuration for the device
    return NextResponse.json({
      success: true,
      screen: {
        id: screen.id,
        name: screen.name,
        orientation: screen.orientation,
        playlist: activePlaylist,
      },
    })
  } catch (error) {
    console.error("[v0] Device pairing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
