import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest, { params }: { params: { screenCode: string } }) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { screenCode } = params

    if (!screenCode) {
      return NextResponse.json({ error: "Screen code is required" }, { status: 400 })
    }

    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("*")
      .eq("screen_code", screenCode)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    let content: any[] = []

    const { data: screenMedia } = await supabase
      .from("screen_media")
      .select(`
        media:media!inner(*)
      `)
      .eq("screen_id", screen.id)

    if (screenMedia && screenMedia.length > 0) {
      content = screenMedia.map((sm: any) => ({
        id: sm.media.id,
        media: sm.media,
        duration_override: 5,
      }))
    }

    if (content.length === 0) {
      const { data: screenPlaylists } = await supabase
        .from("screen_playlists")
        .select(`
          playlist:playlists!inner(
            *,
            playlist_items(
              *,
              media:media!inner(*)
            )
          )
        `)
        .eq("screen_id", screen.id)
        .eq("is_active", true)

      if (screenPlaylists && screenPlaylists.length > 0) {
        screenPlaylists.forEach((sp: any) => {
          if (sp.playlist?.playlist_items) {
            const playlistContent = sp.playlist.playlist_items.sort((a: any, b: any) => a.position - b.position)
            content.push(...playlistContent)

            // Apply first playlist settings
            if (content.length === playlistContent.length && sp.playlist.background_color) {
              screen.background_color = sp.playlist.background_color
              screen.scale_image = sp.playlist.scale_image || "fit"
              screen.scale_video = sp.playlist.scale_video || "fit"
              screen.shuffle = sp.playlist.shuffle || false
            }
          }
        })
      }
    }

    return NextResponse.json(
      {
        screen: {
          ...screen,
          content,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    )
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
