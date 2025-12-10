import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { del } from "@vercel/blob"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params
  console.log("[v0] Permanent delete requested for user:", userId)

  const supabase = await createClient()

  // Verify superadmin access
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] No authenticated user")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log("[v0] Admin user:", user.id)

  const { data: adminProfile, error: adminError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  console.log("[v0] Admin profile:", adminProfile, "Error:", adminError)

  if (!adminProfile || adminProfile.role !== "superadmin") {
    return NextResponse.json({ error: "Only superadmins can permanently delete users" }, { status: 403 })
  }

  // Verify user exists and is soft-deleted - need to check without RLS filter
  const { data: targetUser, error: targetError } = await supabase
    .from("profiles")
    .select("id, email, deleted_at")
    .eq("id", userId)
    .single()

  console.log("[v0] Target user:", targetUser, "Error:", targetError)

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (!targetUser.deleted_at) {
    return NextResponse.json({ error: "User must be soft-deleted first" }, { status: 400 })
  }

  try {
    // 1. Get all media files to delete from blob storage
    const { data: mediaFiles } = await supabase
      .from("media")
      .select("id, file_url, thumbnail_url")
      .eq("user_id", userId)

    // 2. Delete from blob storage
    if (mediaFiles && mediaFiles.length > 0) {
      const blobUrls = mediaFiles.flatMap((m) => [m.file_url, m.thumbnail_url]).filter(Boolean) as string[]

      for (const url of blobUrls) {
        try {
          await del(url)
        } catch (e) {
          console.error("Failed to delete blob:", url, e)
        }
      }
    }

    // 3. Delete playlist_items (references playlists and media)
    const { data: playlists } = await supabase.from("playlists").select("id").eq("user_id", userId)

    if (playlists && playlists.length > 0) {
      const playlistIds = playlists.map((p) => p.id)
      await supabase.from("playlist_items").delete().in("playlist_id", playlistIds)
    }

    // 4. Delete screen_playlists (references screens)
    const { data: screens } = await supabase.from("screens").select("id").eq("user_id", userId)

    if (screens && screens.length > 0) {
      const screenIds = screens.map((s) => s.id)
      await supabase.from("screen_playlists").delete().in("screen_id", screenIds)
    }

    // 5. Delete in order respecting foreign keys
    await supabase.from("api_tokens").delete().eq("user_id", userId)
    await supabase.from("analytics").delete().eq("user_id", userId)
    await supabase.from("devices").delete().eq("user_id", userId)
    await supabase.from("screens").delete().eq("user_id", userId)
    await supabase.from("playlists").delete().eq("user_id", userId)
    await supabase.from("media").delete().eq("user_id", userId)
    await supabase.from("subscriptions").delete().eq("user_id", userId)

    // 6. Finally delete the profile
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)

    if (profileError) {
      console.error("Failed to delete profile:", profileError)
      return NextResponse.json({ error: "Failed to delete user profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Permanent delete error:", error)
    return NextResponse.json({ error: "Failed to permanently delete user" }, { status: 500 })
  }
}
