import { put } from "@vercel/blob"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const tags = formData.get("tags") as string

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select(`
        subscription_plans (
          max_media_storage,
          features
        )
      `)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single()

    const { data: profile } = await supabase
      .from("profiles")
      .select("current_media_count, current_storage_used_mb")
      .eq("id", user.id)
      .single()

    if (subscription?.subscription_plans && profile) {
      const plan = subscription.subscription_plans
      const features = (plan.features as any) || {}
      const maxMediaAssets = features.max_media_assets || 0
      const maxStorageMB = Math.floor((plan.max_media_storage || 0) / (1024 * 1024))
      const currentMedia = profile.current_media_count || 0
      const currentStorageMB = profile.current_storage_used_mb || 0
      const fileSizeMB = file.size / (1024 * 1024)

      if (currentMedia >= maxMediaAssets) {
        return NextResponse.json(
          {
            error: `Media asset limit reached. Your plan allows ${maxMediaAssets} files maximum.`,
          },
          { status: 403 },
        )
      }

      if (currentStorageMB + fileSizeMB > maxStorageMB) {
        return NextResponse.json(
          {
            error: `Storage limit exceeded. Your plan allows ${maxStorageMB}MB maximum. This file would exceed your limit.`,
          },
          { status: 403 },
        )
      }
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not supported" }, { status: 400 })
    }

    // Upload to Vercel Blob with organized path
    const filename = `${user.id}/${Date.now()}-${file.name}`
    const blob = await put(filename, file, {
      access: "public",
    })

    // Save metadata to Supabase
    const { data: mediaData, error: dbError } = await supabase
      .from("media")
      .insert({
        user_id: user.id,
        name: file.name,
        file_path: blob.url,
        file_size: file.size,
        mime_type: file.type,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save media metadata" }, { status: 500 })
    }

    return NextResponse.json({
      id: mediaData.id,
      name: file.name,
      mime_type: file.type,
      file_size: file.size,
      file_path: blob.url,
      tags: mediaData.tags,
      created_at: mediaData.created_at,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
