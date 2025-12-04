import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Check authentication
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

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const requestData = await request.json()
    const { name, location, resolution, orientation, playlist_id, media_id, content_type, selectedContentIds } =
      requestData

    const updateData: any = {
      name,
      location,
      resolution,
      orientation,
      updated_at: new Date().toISOString(),
    }

    if (selectedContentIds && Array.isArray(selectedContentIds) && selectedContentIds.length > 0) {
      // First, delete ALL existing screen_playlist assignments
      await supabase.from("screen_playlists").delete().eq("screen_id", params.id)

      // Clear single media reference
      updateData.media_id = null
      updateData.content_type = "playlist"

      // Check which IDs are playlists vs media
      const { data: playlists } = await supabase
        .from("playlists")
        .select("id")
        .in("id", selectedContentIds)
        .eq("user_id", user.id)

      const playlistIds = playlists?.map((p) => p.id) || []
      const mediaIds = selectedContentIds.filter((id) => !playlistIds.includes(id))

      // Insert new playlist assignments (all active)
      if (playlistIds.length > 0) {
        const playlistAssignments = playlistIds.map((playlistId) => ({
          screen_id: params.id,
          playlist_id: playlistId,
          is_active: true,
        }))

        await supabase.from("screen_playlists").insert(playlistAssignments)
      }

      // Handle media assets - assign first one to media_id
      if (mediaIds.length > 0) {
        updateData.media_id = mediaIds[0]
        updateData.content_type = "asset"
      }
    } else if (content_type !== undefined) {
      updateData.content_type = content_type
    } else if (playlist_id) {
      updateData.content_type = "playlist"
    } else if (media_id) {
      updateData.content_type = "asset"
    } else if (playlist_id === null && media_id === null) {
      updateData.content_type = "none"
    }

    // Only add media_id if it's provided (for backward compatibility)
    if (media_id !== undefined) {
      updateData.media_id = media_id || null
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
      if (error.message?.includes('column "media_id" of relation "screens" does not exist')) {
        return NextResponse.json(
          {
            error: "Database schema needs to be updated. Please run the media_id migration script.",
          },
          { status: 500 },
        )
      }
      return NextResponse.json({ error: "Failed to update screen" }, { status: 500 })
    }

    if (media_id && updateData.media_id !== undefined) {
      const { error: deactivateError } = await supabase.from("screen_playlists").delete().eq("screen_id", params.id)

      if (deactivateError) {
        console.error("Error removing existing playlists:", deactivateError)
      }
    }

    if (playlist_id) {
      await supabase.from("screens").update({ media_id: null }).eq("id", params.id)

      await supabase.from("screen_playlists").delete().eq("screen_id", params.id)

      const { error: insertError } = await supabase.from("screen_playlists").insert({
        screen_id: params.id,
        playlist_id: playlist_id,
        is_active: true,
      })

      if (insertError) {
        console.error("Error creating playlist assignment:", insertError)
        return NextResponse.json({ error: "Failed to assign playlist" }, { status: 500 })
      }
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

    // Removed the filter that was only showing is_active playlists

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

    // Check authentication
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
