import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: menuId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { playlist_id, duration = 30 } = await request.json()

    if (!playlist_id) {
      return NextResponse.json({ error: "playlist_id is required" }, { status: 400 })
    }

    // Verify menu exists and belongs to user
    const { data: menu, error: menuError } = await supabase
      .from("restaurant_menus")
      .select(`
        *,
        menu_template:menu_templates(id, name, layout_config, orientation),
        menu_sections(*, menu_items(*))
      `)
      .eq("id", menuId)
      .eq("user_id", user.id)
      .single()

    if (menuError || !menu) {
      return NextResponse.json({ error: "Menu not found" }, { status: 404 })
    }

    // Verify playlist exists and belongs to user
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id, name, user_id")
      .eq("id", playlist_id)
      .single()

    if (playlistError || !playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 })
    }

    // Check if user owns the playlist or has team access
    if (playlist.user_id !== user.id) {
      // Check team membership
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .eq("owner_id", playlist.user_id)
        .single()

      if (!teamMember) {
        return NextResponse.json({ error: "No access to this playlist" }, { status: 403 })
      }
    }

    // Create or update menu_scene
    const orientation = menu.menu_template?.orientation || "landscape"
    
    // Check if scene already exists for this menu
    const { data: existingScene } = await supabase
      .from("menu_scenes")
      .select("id")
      .eq("menu_id", menuId)
      .eq("user_id", user.id)
      .single()

    let sceneId: string

    if (existingScene) {
      // Update existing scene
      const { data: updatedScene, error: updateError } = await supabase
        .from("menu_scenes")
        .update({
          name: menu.name,
          orientation,
          status: "published",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingScene.id)
        .select("id")
        .single()

      if (updateError) throw updateError
      sceneId = updatedScene.id
    } else {
      // Create new scene
      const { data: newScene, error: createError } = await supabase
        .from("menu_scenes")
        .insert({
          menu_id: menuId,
          user_id: user.id,
          name: menu.name,
          orientation,
          status: "published",
        })
        .select("id")
        .single()

      if (createError) throw createError
      sceneId = newScene.id
    }

    // Check if this scene is already in the playlist
    const { data: existingItem } = await supabase
      .from("playlist_items")
      .select("id")
      .eq("playlist_id", playlist_id)
      .eq("menu_scene_id", sceneId)
      .single()

    if (existingItem) {
      // Already in playlist, just update duration
      await supabase
        .from("playlist_items")
        .update({ duration_override: duration })
        .eq("id", existingItem.id)

      return NextResponse.json({
        success: true,
        message: "Menu updated in playlist",
        scene_id: sceneId,
        playlist_item_id: existingItem.id,
      })
    }

    // Get max position in playlist
    const { data: maxPosItem } = await supabase
      .from("playlist_items")
      .select("position")
      .eq("playlist_id", playlist_id)
      .order("position", { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPosItem?.position ?? -1) + 1

    // Add scene to playlist
    const { data: playlistItem, error: addError } = await supabase
      .from("playlist_items")
      .insert({
        playlist_id,
        content_type: "menu_scene",
        menu_scene_id: sceneId,
        media_id: null,
        duration_override: duration,
        position: nextPosition,
      })
      .select("id")
      .single()

    if (addError) throw addError

    return NextResponse.json({
      success: true,
      message: "Menu published to playlist",
      scene_id: sceneId,
      playlist_item_id: playlistItem.id,
    })
  } catch (error) {
    console.error("Error publishing menu:", error)
    return NextResponse.json(
      { error: "Failed to publish menu" },
      { status: 500 }
    )
  }
}

// GET: Check if menu is published to any playlists
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: menuId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Get scene for this menu
    const { data: scene } = await supabase
      .from("menu_scenes")
      .select("id, status")
      .eq("menu_id", menuId)
      .eq("user_id", user.id)
      .single()

    if (!scene) {
      return NextResponse.json({ published: false, playlists: [] })
    }

    // Get playlists containing this scene
    const { data: items } = await supabase
      .from("playlist_items")
      .select(`
        id,
        duration,
        playlist:playlists(id, name)
      `)
      .eq("menu_scene_id", scene.id)

    const playlists = items?.map((item) => ({
      playlist_item_id: item.id,
      playlist_id: (item.playlist as any)?.id,
      playlist_name: (item.playlist as any)?.name,
      duration: item.duration,
    })) || []

    return NextResponse.json({
      published: playlists.length > 0,
      scene_id: scene.id,
      scene_status: scene.status,
      playlists,
    })
  } catch (error) {
    console.error("Error checking publish status:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}

// DELETE: Remove menu from a playlist
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: menuId } = await params
  const { searchParams } = new URL(request.url)
  const playlistItemId = searchParams.get("playlist_item_id")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!playlistItemId) {
    return NextResponse.json({ error: "playlist_item_id is required" }, { status: 400 })
  }

  try {
    // Delete the playlist item
    const { error } = await supabase
      .from("playlist_items")
      .delete()
      .eq("id", playlistItemId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing from playlist:", error)
    return NextResponse.json({ error: "Failed to remove" }, { status: 500 })
  }
}
