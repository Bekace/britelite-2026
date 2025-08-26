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
        screen_playlists!inner(
          playlist_id,
          is_active,
          playlists(id, name, description)
        )
      `)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .eq("screen_playlists.is_active", true)
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

    const { name, location, resolution, orientation, playlist_id } = await request.json()

    const { data: screen, error } = await supabase
      .from("screens")
      .update({
        name,
        location,
        resolution,
        orientation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to update screen" }, { status: 500 })
    }

    if (playlist_id) {
      // Deactivate existing playlist assignments
      await supabase.from("screen_playlists").update({ is_active: false }).eq("screen_id", params.id)

      // Create or activate new playlist assignment
      const { error: playlistError } = await supabase.from("screen_playlists").upsert({
        screen_id: params.id,
        playlist_id: playlist_id,
        is_active: true,
        created_at: new Date().toISOString(),
      })

      if (playlistError) {
        console.error("Playlist assignment error:", playlistError)
        return NextResponse.json({ error: "Failed to assign playlist" }, { status: 500 })
      }
    } else {
      await supabase.from("screen_playlists").update({ is_active: false }).eq("screen_id", params.id)
    }

    return NextResponse.json({ screen })
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
