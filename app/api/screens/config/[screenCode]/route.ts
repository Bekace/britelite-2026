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
    console.log("[v0] Config API called for screen:", screenCode)

    if (!screenCode) {
      return NextResponse.json({ error: "Screen code is required" }, { status: 400 })
    }

    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("*")
      .eq("screen_code", screenCode)
      .single()

    console.log("[v0] Screen query result:", { screen: screen?.id, error: screenError })

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    let content: any[] = []
    let mostRecentUpdate = screen.updated_at

    if (screen.content_type === "playlist") {
      console.log("[v0] Screen has playlist content_type, fetching playlists...")

      const { data: playlistContent, error: playlistError } = await supabase.rpc("get_screen_playlist_content", {
        p_screen_id: screen.id,
      })

      if (playlistError || !playlistContent) {
        const { data: screenPlaylists, error: spError } = await supabase
          .from("screen_playlists")
          .select("playlist_id, playlists(updated_at)")
          .eq("screen_id", screen.id)
          .limit(1)
          .single()

        console.log("[v0] Screen playlists query:", { screenPlaylists, error: spError })

        if (screenPlaylists) {
          const playlistId = screenPlaylists.playlist_id
          console.log("[v0] Fetching items for playlist:", playlistId)

          const { data: items, error: itemsError } = await supabase
            .from("playlist_items")
            .select(
              `
              id,
              position,
              duration_override,
              transition_type,
              transition_duration,
              updated_at,
              media:media_id (
                id,
                name,
                file_path,
                thumbnail_path,
                mime_type
              )
            `,
            )
            .eq("playlist_id", playlistId)
            .order("position")

          console.log("[v0] Playlist items query:", { itemsCount: items?.length, error: itemsError })

          if (items) {
            items.forEach((item) => {
              if (item.updated_at && item.updated_at > mostRecentUpdate) {
                mostRecentUpdate = item.updated_at
              }
            })

            content = items
              .filter((item) => item.media)
              .map((item: any) => ({
                id: item.media.id,
                name: item.media.name,
                type: item.media.mime_type,
                url: item.media.file_path,
                thumbnail: item.media.thumbnail_path,
                media: item.media,
                duration_override: item.duration_override || 10,
                transition_type: item.transition_type || "fade",
                transition_duration: item.transition_duration || 0.8,
              }))

            console.log("[v0] Final content array length:", content.length)
          }
        }
      } else {
        console.log("[v0] Using RPC result")
        content = playlistContent
      }
    } else if (screen.content_type === "asset") {
      console.log("[v0] Screen has asset content_type")
      const { data: screenMedia } = await supabase
        .from("screen_media")
        .select(
          `
          id,
          media:media_id (
            id,
            name,
            file_path,
            thumbnail_path,
            mime_type
          )
        `,
        )
        .eq("screen_id", screen.id)

      if (screenMedia) {
        content = screenMedia
          .filter((sm) => sm.media)
          .map((sm: any) => ({
            id: sm.media.id,
            name: sm.media.name,
            type: sm.media.mime_type,
            url: sm.media.file_path,
            thumbnail: sm.media.thumbnail_path,
            media: sm.media,
            duration_override: 10,
            transition_type: "fade",
            transition_duration: 0.8,
          }))
      }
    }

    if (screen.shuffle && content.length > 1) {
      content = content.sort(() => Math.random() - 0.5)
    }

    console.log("[v0] Returning response with content length:", content.length)

    return NextResponse.json(
      {
        screen: {
          ...screen,
          updated_at: mostRecentUpdate,
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
    console.error(`[v0] Config API error:`, error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
