import { uploadFile } from "@/lib/gcs/client"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Upload route - Starting request processing")

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
      console.log("[v0] Authentication failed:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] User authenticated:", user.id)

    const formData = await request.formData()
    const file = formData.get("file") as File
    const tags = formData.get("tags") as string

    if (!file) {
      console.log("[v0] No file provided in request")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[v0] Upload attempt - File:", file.name, "Size:", file.size, "Type:", file.type)

    const { data: uploadSettings, error: settingsError } = await supabase.from("upload_settings").select("*").single()

    if (settingsError) {
      console.log("[v0] No upload settings found (using defaults):", settingsError.message)
    }

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

    let maxFileSize: number
    if (uploadSettings?.enforce_globally) {
      maxFileSize = uploadSettings.max_file_size
      console.log("[v0] Using global max file size:", maxFileSize)
    } else {
      maxFileSize = userData?.user_subscriptions?.subscription_plans?.max_file_size || 10 * 1024 * 1024
      console.log("[v0] Using plan max file size:", maxFileSize)
    }

    const maxStorageBytes =
      userData?.user_subscriptions?.subscription_plans?.max_media_storage || 1 * 1024 * 1024 * 1024

    console.log("[v0] Storage limits - Max file size:", maxFileSize, "Max storage:", maxStorageBytes)

    if (file.size > maxFileSize) {
      const maxFileSizeMB = Math.round(maxFileSize / (1024 * 1024))
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2)
      console.log("[v0] File too large:", fileSizeMB, "MB exceeds", maxFileSizeMB, "MB")
      return NextResponse.json(
        {
          error: `File size (${fileSizeMB} MB) exceeds the maximum file size of ${maxFileSizeMB} MB.`,
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

    const allowedTypes = uploadSettings?.allowed_file_types || [
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
          error: `File type "${file.type}" is not supported. Please check the allowed file types in your upload settings.`,
        },
        { status: 400 },
      )
    }

    console.log("[v0] Validation passed, uploading to Google Cloud Storage...")

    let publicUrl: string
    try {
      // Convert file to buffer for GCS upload
      const arrayBuffer = await file.arrayBuffer()
      const fileBuffer = Buffer.from(arrayBuffer)

      // Upload to Google Cloud Storage with organized path
      const filename = `${user.id}/${Date.now()}-${file.name}`
      publicUrl = await uploadFile(filename, fileBuffer, file.type)
      console.log("[v0] GCS uploaded:", publicUrl)
    } catch (storageError: any) {
      console.error("[v0] Google Cloud Storage upload failed:", storageError)

      // Handle various error formats from GCS
      let errorMessage = "Unknown storage error"
      let statusCode = 500

      if (storageError?.message && typeof storageError.message === "string") {
        errorMessage = storageError.message

        // Check for quota or size errors
        if (storageError.message.includes("quota") || storageError.message.includes("limit")) {
          statusCode = 413
          errorMessage = "Storage quota exceeded"
        }
      }

      return NextResponse.json(
        {
          error: `Storage upload failed: ${errorMessage}`,
        },
        { status: statusCode },
      )
    }

    // Save metadata to Supabase
    const { data: insertedMediaData, error: dbError } = await supabase
      .from("media")
      .insert({
        user_id: user.id,
        name: file.name,
        file_path: publicUrl,
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
      file_path: publicUrl,
      tags: insertedMediaData.tags,
      created_at: insertedMediaData.created_at,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
