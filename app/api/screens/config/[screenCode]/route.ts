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

    // Fetch direct media assignments
    const { data: screenMedia } = await supabase
      .from("screen_media")
      .select(`
        media:media!inner(*)
      `)
      .eq("screen_id", screen.id)

    if (screenMedia && screenMedia.length > 0) {
      const mediaContent = screenMedia.map((sm: any) => ({
        id: sm.media.id,
        name: sm.media.name,
        type: sm.media.content_type,
        url: sm.media.file_url,
        thumbnail: sm.media.thumbnail_url,
        media: sm.media,
        duration_override: 10,
        transition_type: "fade",
        transition_duration: 0.8,
      }))
      content.push(...mediaContent)
    }

    // Fetch playlist assignments
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

    if (screenPlaylists && screenPlaylists.length > 0) {
      screenPlaylists.forEach((sp: any) => {
        if (sp.playlist?.playlist_items) {
          const playlistContent = sp.playlist.playlist_items
            .sort((a: any, b: any) => a.position - b.position)
            .map((item: any) => ({
              id: item.media.id,
              name: item.media.name,
              type: item.media.content_type,
              url: item.media.file_url,
              thumbnail: item.media.thumbnail_url,
              media: item.media,
              duration_override: item.duration_override || sp.playlist.default_duration || 10,
              transition_type: item.transition_type || sp.playlist.transition_type || "fade",
              transition_duration: item.transition_duration || sp.playlist.transition_duration || 0.8,
            }))
          content.push(...playlistContent)

          // Apply first playlist settings to screen
          if (sp.playlist.background_color) {
            screen.background_color = screen.background_color || sp.playlist.background_color
            screen.scale_image = screen.scale_image || sp.playlist.scale_image || "fit"
            screen.scale_video = screen.scale_video || sp.playlist.scale_video || "fit"
            screen.shuffle = sp.playlist.shuffle || false
          }
        }
      })
    }

    console.log(`[v0] Screen ${screenCode}: Found ${content.length} content items`)
    console.log(`[v0] - Direct media: ${screenMedia?.length || 0}`)
    console.log(`[v0] - Playlists: ${screenPlaylists?.length || 0}`)
    if (screenPlaylists && screenPlaylists.length > 0) {
      screenPlaylists.forEach((sp: any, index: number) => {
        console.log(`[v0]   - Playlist ${index + 1}: ${sp.playlist?.playlist_items?.length || 0} items`)
      })
    }

    if (screen.shuffle && content.length > 1) {
      content = content.sort(() => Math.random() - 0.5)
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
