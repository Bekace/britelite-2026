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
        )
      `)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    if (screen.screen_playlists) {
      screen.screen_playlists = screen.screen_playlists.filter((sp: any) => sp.is_active)
      // If there's an active playlist, set it as the main playlist reference
      if (screen.screen_playlists.length > 0) {
        screen.playlists = screen.screen_playlists[0].playlists
        screen.playlist_id = screen.screen_playlists[0].playlist_id
      }
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

    const requestData = await request.json()
    const { name, location, resolution, orientation, playlist_id } = requestData

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

    // First, deactivate all existing playlist assignments for this screen
    const { error: deactivateError } = await supabase
      .from("screen_playlists")
      .update({ is_active: false })
      .eq("screen_id", params.id)

    if (deactivateError) {
      console.error("Error deactivating existing playlists:", deactivateError)
    }

    if (playlist_id) {
      // Check if a record already exists for this screen-playlist combination
      const { data: existingAssignment } = await supabase
        .from("screen_playlists")
        .select("id")
        .eq("screen_id", params.id)
        .eq("playlist_id", playlist_id)
        .single()

      if (existingAssignment) {
        // Update existing record to make it active
        const { error: updateError } = await supabase
          .from("screen_playlists")
          .update({ is_active: true })
          .eq("id", existingAssignment.id)

        if (updateError) {
          console.error("Error updating existing assignment:", updateError)
          return NextResponse.json({ error: "Failed to activate playlist assignment" }, { status: 500 })
        }
      } else {
        // Create new assignment
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
    }

    const { data: updatedScreen, error: fetchError } = await supabase
      .from("screens")
      .select(`
        *,
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

    if (updatedScreen.screen_playlists) {
      updatedScreen.screen_playlists = updatedScreen.screen_playlists.filter((sp: any) => sp.is_active)
      if (updatedScreen.screen_playlists.length > 0) {
        updatedScreen.playlists = updatedScreen.screen_playlists[0].playlists
        updatedScreen.playlist_id = updatedScreen.screen_playlists[0].playlist_id
      }
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
