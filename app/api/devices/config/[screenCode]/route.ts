import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { screenCode: string } }) {
  try {
    const { screenCode } = params

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Get screen configuration
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
        updated_at,
        playlists (
          id,
          name,
          background_color
        )
      `)
      .eq("screen_code", screenCode)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    const configVersion = new Date(screen.updated_at).getTime().toString()
    const clientETag = request.headers.get("if-none-match")

    // Return 304 if configuration hasn't changed
    if (clientETag === configVersion) {
      return new NextResponse(null, { status: 304 })
    }

    // Update last_seen timestamp
    await supabase.from("screens").update({ last_seen: new Date().toISOString() }).eq("id", screen.id)

    const response = NextResponse.json({
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

    response.headers.set("ETag", configVersion)
    response.headers.set("Cache-Control", "no-cache")

    return response
  } catch (error) {
    console.error("Get device config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
