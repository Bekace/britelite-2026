import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { screenCode } = await request.json()

    if (!screenCode) {
      return NextResponse.json({ error: "Screen code is required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Find screen by screen code
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select(`
        id,
        name,
        screen_code,
        orientation,
        status,
        playlist_id,
        content_type,
        content_id,
        playlists (
          id,
          name,
          background_color
        )
      `)
      .eq("screen_code", screenCode)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Invalid screen code" }, { status: 404 })
    }

    // Update screen status to paired and set last_seen
    const { error: updateError } = await supabase
      .from("screens")
      .update({
        status: "paired",
        last_seen: new Date().toISOString(),
      })
      .eq("id", screen.id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update screen status" }, { status: 500 })
    }

    // Return screen configuration for the device
    return NextResponse.json({
      success: true,
      screen: {
        id: screen.id,
        name: screen.name,
        orientation: screen.orientation,
        contentType: screen.content_type,
        contentId: screen.content_id,
        playlistId: screen.playlist_id,
        playlist: screen.playlists,
      },
    })
  } catch (error) {
    console.error("Device pairing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
