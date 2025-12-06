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

    if (screen.content_type === "asset") {
      // Fetch direct media assignments
      const { data: screenMedia } = await supabase
        .from("screen_media")
        .select(`
          id,
          media_id,
          screen_id,
          media (*)
        `)
        .eq("screen_id", screen.id)

      console.log(`[v0] Raw screenMedia from DB:`, JSON.stringify(screenMedia, null, 2))

      if (screenMedia && screenMedia.length > 0) {
        const mediaContent = screenMedia
          .filter((sm: any) => sm.media) // Filter out items without media
          .map((sm: any) => {
            console.log(`[v0] Processing direct media:`, {
              id: sm.media?.id,
              name: sm.media?.name,
              mime_type: sm.media?.mime_type,
              file_path: sm.media?.file_path,
            })
            return {
              id: sm.media.id,
              name: sm.media.name,
              type: sm.media.mime_type,
              url: sm.media.file_path,
              thumbnail: sm.media.thumbnail_path,
              media: sm.media,
              duration_override: 10,
              transition_type: "fade",
              transition_duration: 0.8,
            }
          })
        content.push(...mediaContent)
      }
    } else if (screen.content_type === "playlist") {
      const { data: screenPlaylists } = await supabase
        .from("screen_playlists")
        .select("playlist_id")
        .eq("screen_id", screen.id)

      console.log(`[v0] Found ${screenPlaylists?.length || 0} playlist assignments`)

      if (screenPlaylists && screenPlaylists.length > 0) {
        const playlistId = screenPlaylists[0].playlist_id

        const { data: playlistItems, error: itemsError } = await supabase
          .from("playlist_items")
          .select(`
            id,
            position,
            duration_override,
            transition_type,
            transition_duration,
            media_id,
            media (
              id,
              name,
              mime_type,
              file_path,
              thumbnail_path
            )
          `)
          .eq("playlist_id", playlistId)
          .order("position")

        console.log(`[v0] Raw playlist items from DB:`, JSON.stringify(playlistItems, null, 2))

        if (itemsError) {
          console.error(`[v0] Error fetching playlist items:`, itemsError)
        }

        if (playlistItems && playlistItems.length > 0) {
          const playlistContent = playlistItems
            .filter((item: any) => item.media) // Filter out items without media
            .map((item: any) => {
              console.log(`[v0] Processing playlist item:`, {
                id: item.media?.id,
                name: item.media?.name,
                mime_type: item.media?.mime_type,
                file_path: item.media?.file_path,
              })
              return {
                id: item.media.id,
                name: item.media.name,
                type: item.media.mime_type,
                url: item.media.file_path,
                thumbnail: item.media.thumbnail_path,
                media: item.media,
                duration_override: item.duration_override || 10,
                transition_type: item.transition_type || "fade",
                transition_duration: item.transition_duration || 0.8,
              }
            })
          content.push(...playlistContent)
        }
      }
    }

    console.log(`[v0] Screen ${screenCode}: Found ${content.length} content items (type: ${screen.content_type})`)

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
