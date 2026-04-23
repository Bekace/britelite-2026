import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { syncStripeQuantityWithScreens } from "@/lib/actions/stripe"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
        screen_media!left(
          media_id,
          media(id, name, mime_type, file_path)
        ),
        media(id, name, mime_type, file_path)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    return NextResponse.json({ screen })
  } catch (error) {
    console.error("Error fetching screen:", error)
    return NextResponse.json({ error: "Failed to fetch screen" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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
    const {
      name,
      location,
      resolution,
      orientation,
      selectedContentIds,
      content_type,
      enable_audio_management,
      shuffle,
      is_active,
      scale_image,
      scale_video,
      scale_document,
      background_color,
      default_transition,
      timezone,
    } = requestData

    const updateData: any = {
      name,
      location,
      resolution,
      orientation,
      updated_at: new Date().toISOString(),
    }

    if (enable_audio_management !== undefined) updateData.enable_audio_management = enable_audio_management
    if (shuffle !== undefined) updateData.shuffle = shuffle
    if (is_active !== undefined) updateData.is_active = is_active
    if (scale_image !== undefined) updateData.scale_image = scale_image
    if (scale_video !== undefined) updateData.scale_video = scale_video
    if (scale_document !== undefined) updateData.scale_document = scale_document
    if (background_color !== undefined) updateData.background_color = background_color
    if (default_transition !== undefined) updateData.default_transition = default_transition
    if (timezone !== undefined) updateData.timezone = timezone

    await supabase.from("screen_playlists").delete().eq("screen_id", id)
    await supabase.from("screen_media").delete().eq("screen_id", id)
    await supabase.from("screen_schedules").delete().eq("screen_id", id)

    if (content_type === "playlist" && selectedContentIds && selectedContentIds.length > 0) {
      updateData.content_type = "playlist"
      updateData.media_id = null

      const { error: playlistInsertError } = await supabase
        .from("screen_playlists")
        .insert([{ screen_id: id, playlist_id: selectedContentIds[0], is_active: true }])
        .select()

      if (playlistInsertError) {
        console.error("[v0] Error inserting playlist:", playlistInsertError)
        return NextResponse.json({ error: "Failed to assign playlist: " + playlistInsertError.message }, { status: 500 })
      }
    } else if (content_type === "asset" && selectedContentIds && selectedContentIds.length > 0) {
      updateData.content_type = "asset"
      updateData.media_id = null

      const mediaAssignments = selectedContentIds.map((mediaId: string) => ({ screen_id: id, media_id: mediaId }))
      const { error: mediaInsertError } = await supabase.from("screen_media").insert(mediaAssignments).select()

      if (mediaInsertError) {
        console.error("[v0] Error inserting media:", mediaInsertError)
        return NextResponse.json({ error: "Failed to assign media: " + mediaInsertError.message }, { status: 500 })
      }
    } else if (content_type === "schedule" && selectedContentIds && selectedContentIds.length > 0) {
      updateData.content_type = "schedule"
      updateData.media_id = null

      const { error: scheduleInsertError } = await supabase
        .from("screen_schedules")
        .insert([{ screen_id: id, schedule_id: selectedContentIds[0], is_active: true }])
        .select()

      if (scheduleInsertError) {
        console.error("[v0] Error inserting schedule:", scheduleInsertError)
        return NextResponse.json({ error: "Failed to assign schedule: " + scheduleInsertError.message }, { status: 500 })
      }
    } else {
      updateData.content_type = "none"
      updateData.media_id = null
    }

    const { data: screen, error: updateError } = await supabase
      .from("screens")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Database error:", updateError)
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
        ),
        screen_media!left(
          media_id,
          media(id, name, mime_type, file_path)
        ),
        screen_schedules!left(
          schedule_id,
          is_active,
          schedules(id, name)
        )
      `)
      .eq("id", id)
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
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

    const { error } = await supabase.from("screens").delete().eq("id", id).eq("user_id", user.id)

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to delete screen" }, { status: 500 })
    }

    const syncResult = await syncStripeQuantityWithScreens(user.id)
    if (syncResult.error) {
      console.error("[v0] Stripe sync failed after screen delete (non-fatal):", syncResult.error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting screen:", error)
    return NextResponse.json({ error: "Failed to delete screen" }, { status: 500 })
  }
}
