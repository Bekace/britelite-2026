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

    console.log("[v0] Upload attempt - File:", file.name, "Size:", file.size, "Type:", file.type)

    // Get user's storage limits
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select(`
        *,
        user_subscriptions!inner(
          status,
          subscription_plans(
            max_media_storage,
            max_file_size
          )
        )
      `)
      .eq("id", user.id)
      .single()

    const maxStorageBytes =
      userData?.user_subscriptions?.subscription_plans?.max_media_storage || 1 * 1024 * 1024 * 1024
    const maxFileSize = userData?.user_subscriptions?.subscription_plans?.max_file_size || 10 * 1024 * 1024

    console.log("[v0] Storage limits - Max file size:", maxFileSize, "Max storage:", maxStorageBytes)

    if (file.size > maxFileSize) {
      const maxFileSizeMB = Math.round(maxFileSize / (1024 * 1024))
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      console.log("[v0] File too large:", fileSizeMB, "MB exceeds", maxFileSizeMB, "MB")
      return NextResponse.json(
        {
          error: `File size (${fileSizeMB} MB) exceeds your plan's maximum file size of ${maxFileSizeMB} MB.`,
        },
        { status: 413 },
      )
    }

    const isUnlimited = maxStorageBytes === -1
    const maxStorageGB = isUnlimited ? -1 : Math.round(maxStorageBytes / (1024 * 1024 * 1024))

    // Calculate current storage usage
    const { data: mediaData, error: mediaError } = await supabase
      .from("media")
      .select("file_size")
      .eq("user_id", user.id)

    if (mediaError) {
      console.error("Media data error:", mediaError)
      return NextResponse.json({ error: "Failed to check storage usage" }, { status: 500 })
    }

    const currentStorageBytes = mediaData?.reduce((total, item) => total + (item.file_size || 0), 0) || 0

    if (!isUnlimited && currentStorageBytes + file.size > maxStorageBytes) {
      const remainingGB = Math.max(0, (maxStorageBytes - currentStorageBytes) / (1024 * 1024 * 1024))
      console.log("[v0] Storage exceeded - Remaining:", remainingGB, "GB")
      return NextResponse.json(
        {
          error: `Storage limit exceeded. You have ${remainingGB.toFixed(2)} GB remaining of your ${maxStorageGB} GB limit.`,
        },
        { status: 413 },
      )
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/webm",
      "video/x-msvideo",
      "application/pdf",
    ]

    if (!allowedTypes.includes(file.type)) {
      console.log("[v0] Unsupported file type:", file.type)
      return NextResponse.json(
        {
          error: `File type "${file.type}" is not supported. Allowed types: images (JPEG, PNG, GIF, WebP, SVG), videos (MP4, WebM, QuickTime), and PDFs.`,
        },
        { status: 400 },
      )
    }

    console.log("[v0] Validation passed, uploading to Vercel Blob...")

    let blob
    try {
      // Upload to Vercel Blob with organized path
      const filename = `${user.id}/${Date.now()}-${file.name}`
      blob = await put(filename, file, {
        access: "public",
      })
      console.log("[v0] Blob uploaded:", blob.url)
    } catch (blobError: any) {
      console.error("[v0] Vercel Blob error:", blobError)

      // Try to get error message from various error formats
      let errorMessage = "Unknown error"

      if (blobError?.message) {
        errorMessage = blobError.message
      } else if (typeof blobError === "string") {
        errorMessage = blobError
      } else if (blobError?.toString) {
        errorMessage = blobError.toString()
      }

      // Check if it's a size limit error
      if (
        errorMessage.toLowerCase().includes("request entity too large") ||
        errorMessage.includes("413") ||
        errorMessage.toLowerCase().includes("payload too large")
      ) {
        console.log("[v0] Vercel Blob size limit exceeded")
        return NextResponse.json(
          {
            error: `File is too large for Vercel Blob storage. The free tier has a ~4.5MB per-file limit. Please upgrade your Vercel account or contact support.`,
          },
          { status: 413 },
        )
      }

      // Generic blob error
      return NextResponse.json(
        {
          error: `File upload to storage failed: ${errorMessage}`,
        },
        { status: 500 },
      )
    }

    // Save metadata to Supabase
    const { data: insertedMediaData, error: dbError } = await supabase
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

    console.log("[v0] Upload complete:", insertedMediaData.id)

    return NextResponse.json({
      id: insertedMediaData.id,
      name: file.name,
      mime_type: file.type,
      file_size: file.size,
      file_path: blob.url,
      tags: insertedMediaData.tags,
      created_at: insertedMediaData.created_at,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
