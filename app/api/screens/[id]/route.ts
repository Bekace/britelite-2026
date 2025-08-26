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
    console.log("[v0] API received data:", requestData)

    const { name, location, resolution, orientation, playlist_id } = requestData
    console.log("[v0] Extracted playlist_id:", playlist_id)

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

    console.log("[v0] Screen updated successfully:", screen)

    if (playlist_id) {
      console.log("[v0] Assigning playlist:", playlist_id)
      // Deactivate existing playlist assignments
      const { error: deactivateError } = await supabase
        .from("screen_playlists")
        .update({ is_active: false })
        .eq("screen_id", params.id)

      if (deactivateError) {
        console.log("[v0] Error deactivating existing playlists:", deactivateError)
      }

      // Create or activate new playlist assignment
      const { error: playlistError } = await supabase.from("screen_playlists").upsert({
        screen_id: params.id,
        playlist_id: playlist_id,
        is_active: true,
        created_at: new Date().toISOString(),
      })

      if (playlistError) {
        console.error("[v0] Playlist assignment error:", playlistError)
        return NextResponse.json({ error: "Failed to assign playlist" }, { status: 500 })
      }

      console.log("[v0] Playlist assigned successfully")
    } else {
      console.log("[v0] No playlist_id provided, deactivating existing assignments")
      await supabase.from("screen_playlists").update({ is_active: false }).eq("screen_id", params.id)
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
      console.log("[v0] Error fetching updated screen:", fetchError)
      // Return the basic screen data if we can't fetch the playlist info
      return NextResponse.json({ screen })
    }

    if (updatedScreen.screen_playlists) {
      updatedScreen.screen_playlists = updatedScreen.screen_playlists.filter((sp: any) => sp.is_active)
      if (updatedScreen.screen_playlists.length > 0) {
        updatedScreen.playlists = updatedScreen.screen_playlists[0].playlists
        updatedScreen.playlist_id = updatedScreen.screen_playlists[0].playlist_id
      }
    }

    console.log("[v0] Returning updated screen with playlist:", updatedScreen)
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
