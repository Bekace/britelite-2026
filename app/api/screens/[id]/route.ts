import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: screen, error } = await supabase
      .from("screens")
      .select(`
        *,
        screen_playlists!left(
          playlist_id,
          is_active,
          playlists(id, name, description)
        ),
        media(id, name, mime_type, file_path)
      `)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    // No longer filtering by is_active since edit dialog needs all assignments

    return NextResponse.json({ screen })
  } catch (error) {
    console.error("Error fetching screen:", error)
    return NextResponse.json({ error: "Failed to fetch screen" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestData = await request.json()
    const { name, location, resolution, orientation, selectedContentIds } = requestData

    const updateData: any = {
      name,
      location,
      resolution,
      orientation,
      updated_at: new Date().toISOString(),
    }

    if (selectedContentIds && Array.isArray(selectedContentIds)) {
      // Delete ALL existing screen_playlist assignments
      await supabase.from("screen_playlists").delete().eq("screen_id", params.id)

      if (selectedContentIds.length === 0) {
        updateData.media_id = null
        updateData.content_type = "none"
      } else {
        const { data: playlists } = await supabase
          .from("playlists")
          .select("id")
          .in("id", selectedContentIds)
          .eq("user_id", user.id)

        const playlistIds = playlists?.map((p) => p.id) || []
        const mediaIds = selectedContentIds.filter((id) => !playlistIds.includes(id))

        if (playlistIds.length > 0) {
          const playlistAssignments = playlistIds.map((playlistId) => ({
            screen_id: params.id,
            playlist_id: playlistId,
            is_active: true,
          }))

          await supabase.from("screen_playlists").insert(playlistAssignments)

          if (mediaIds.length === 0) {
            updateData.content_type = "playlist"
            updateData.media_id = null
          }
        }

        if (mediaIds.length > 0) {
          updateData.media_id = mediaIds[0]
          updateData.content_type = "asset"
        }
      }
    }

    const { data: screen, error } = await supabase
      .from("screens")
      .update(updateData)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update screen" }, { status: 500 })
    }

    const { data: updatedScreen, error: fetchError } = await supabase
      .from("screens")
      .select(`
        *,
        media(id, name, mime_type, file_path),
        screen_playlists!left(
          playlist_id,
          is_active,
          playlists(id, name, description)
        )
      `)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ screen })
    }

    return NextResponse.json({ screen: updatedScreen })
  } catch (error) {
    console.error("Error updating screen:", error)
    return NextResponse.json({ error: "Failed to update screen" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete screen
    const { error } = await supabase.from("screens").delete().eq("id", params.id).eq("user_id", user.id)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to delete screen" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting screen:", error)
    return NextResponse.json({ error: "Failed to delete screen" }, { status: 500 })
  }
}
