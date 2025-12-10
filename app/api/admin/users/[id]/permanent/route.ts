import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import { createClient } from "@supabase/supabase-js"
import { del } from "@vercel/blob"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { profile } = await requireAdmin()
    const userId = params.id

    // Only superadmins can permanently delete users
    if (profile.role !== "superadmin") {
      return NextResponse.json({ error: "Only superadmins can permanently delete users" }, { status: 403 })
    }

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // Verify user exists and is soft-deleted
    const { data: targetUser } = await adminSupabase
      .from("profiles")
      .select("id, email, deleted_at")
      .eq("id", userId)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!targetUser.deleted_at) {
      return NextResponse.json({ error: "User must be soft-deleted first" }, { status: 400 })
    }

    // 1. Get all media files to delete from blob storage
    const { data: mediaFiles } = await adminSupabase
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
    const { data: playlists } = await adminSupabase.from("playlists").select("id").eq("user_id", userId)

    if (playlists && playlists.length > 0) {
      const playlistIds = playlists.map((p) => p.id)
      await adminSupabase.from("playlist_items").delete().in("playlist_id", playlistIds)
    }

    // 4. Delete screen_playlists (references screens)
    const { data: screens } = await adminSupabase.from("screens").select("id").eq("user_id", userId)

    if (screens && screens.length > 0) {
      const screenIds = screens.map((s) => s.id)
      await adminSupabase.from("screen_playlists").delete().in("screen_id", screenIds)
    }

    // 5. Delete in order respecting foreign keys
    await adminSupabase.from("api_tokens").delete().eq("user_id", userId)
    await adminSupabase.from("analytics").delete().eq("user_id", userId)
    await adminSupabase.from("devices").delete().eq("user_id", userId)
    await adminSupabase.from("screens").delete().eq("user_id", userId)
    await adminSupabase.from("playlists").delete().eq("user_id", userId)
    await adminSupabase.from("media").delete().eq("user_id", userId)
    await adminSupabase.from("user_subscriptions").delete().eq("user_id", userId)

    // 6. Finally delete the profile
    const { error: profileError } = await adminSupabase.from("profiles").delete().eq("id", userId)

    if (profileError) {
      console.error("Failed to delete profile:", profileError)
      return NextResponse.json({ error: "Failed to delete user profile" }, { status: 500 })
    }

    await logAdminAction({
      action: "permanent_delete_user",
      targetType: "user",
      targetId: userId,
      details: { deleted_by: profile.id, email: targetUser.email, timestamp: new Date().toISOString() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Permanent delete error:", error)
    return NextResponse.json({ error: "Failed to permanently delete user" }, { status: 500 })
  }
}
