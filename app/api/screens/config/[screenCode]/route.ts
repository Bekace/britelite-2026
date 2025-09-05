import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { screenCode: string } }) {
  try {
    const supabase = createClient()
    const { screenCode } = params

    // Get screen by screen code
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select(`
        id,
        name,
        orientation,
        background_color,
        media_id,
        scale_image,
        scale_video,
        scale_document,
        shuffle,
        default_transition
      `)
      .eq("screen_code", screenCode)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    let content: any[] = []

    // Check if screen has individual media assigned
    if (screen.media_id) {
      const { data: media } = await supabase
        .from("media")
        .select("id, name, file_path, mime_type")
        .eq("id", screen.media_id)
        .single()

      if (media) {
        content = [
          {
            id: media.id,
            media: media,
            duration_override: 5,
          },
        ]
      }
    } else {
      // Get playlist content
      const { data: playlistItems } = await supabase
        .from("screen_playlists")
        .select(`
          playlist:playlists!inner(
            id,
            name,
            background_color,
            scale_image,
            scale_video,
            scale_document,
            shuffle,
            default_transition,
            playlist_items(
              id,
              position,
              duration_override,
              media:media!inner(
                id,
                name,
                file_path,
                mime_type
              )
            )
          )
        `)
        .eq("screen_id", screen.id)
        .eq("is_active", true)

      if (playlistItems?.[0]?.playlist?.playlist_items) {
        const playlist = playlistItems[0].playlist
        content = playlist.playlist_items.sort((a: any, b: any) => a.position - b.position)

        // Apply playlist settings to screen if not set
        if (!screen.background_color && playlist.background_color) {
          screen.background_color = playlist.background_color
        }
        if (!screen.scale_image && playlist.scale_image) {
          screen.scale_image = playlist.scale_image
        }
        if (!screen.scale_video && playlist.scale_video) {
          screen.scale_video = playlist.scale_video
        }
        if (!screen.scale_document && playlist.scale_document) {
          screen.scale_document = playlist.scale_document
        }
        if (screen.shuffle === null && playlist.shuffle !== null) {
          screen.shuffle = playlist.shuffle
        }
        if (!screen.default_transition && playlist.default_transition) {
          screen.default_transition = playlist.default_transition
        }
      }
    }

    // Apply shuffle if enabled
    if (screen.shuffle && content.length > 1) {
      content = [...content].sort(() => Math.random() - 0.5)
    }

    return NextResponse.json({
      screen: {
        ...screen,
        content,
      },
    })
  } catch (error) {
    console.error("Screen config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
