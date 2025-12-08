import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { generateSignedUploadUrl } from "@/lib/gcs/rest-client"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fileName, fileSize, fileType, tags } = await request.json()

    if (!fileName || !fileSize || !fileType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Get upload URL request:", { fileName, fileSize, fileType })

    // Get upload settings
    const { data: uploadSettingsArray } = await supabase.from("upload_settings").select("*").limit(1)
    const uploadSettings = uploadSettingsArray && uploadSettingsArray.length > 0 ? uploadSettingsArray[0] : null

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

    if (userError) {
      console.error("[v0] User data error:", userError)
      return NextResponse.json({ error: "Failed to fetch user subscription data" }, { status: 500 })
    }

    // Determine max file size
    let maxFileSize: number
    if (uploadSettings?.enforce_globally && uploadSettings.max_file_size) {
      maxFileSize = uploadSettings.max_file_size
    } else if (userData?.user_subscriptions?.subscription_plans?.max_file_size) {
      maxFileSize = userData.user_subscriptions.subscription_plans.max_file_size
    } else {
      maxFileSize = 500 * 1024 * 1024 // Default 500MB
    }

    // Validate file size
    if (fileSize > maxFileSize) {
      const maxFileSizeMB = Math.round(maxFileSize / (1024 * 1024))
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2)
      return NextResponse.json(
        { error: `File size (${fileSizeMB} MB) exceeds the maximum file size of ${maxFileSizeMB} MB.` },
        { status: 413 },
      )
    }

    // Check storage limit
    const maxStorageBytes =
      userData?.user_subscriptions?.subscription_plans?.max_media_storage || 1 * 1024 * 1024 * 1024
    const isUnlimited = maxStorageBytes === -1

    const { data: mediaData } = await supabase.from("media").select("file_size").eq("user_id", user.id)

    const currentStorageBytes = mediaData?.reduce((total, item) => total + (item.file_size || 0), 0) || 0

    if (!isUnlimited && currentStorageBytes + fileSize > maxStorageBytes) {
      const remainingGB = Math.max(0, (maxStorageBytes - currentStorageBytes) / (1024 * 1024 * 1024))
      const maxStorageGB = Math.round(maxStorageBytes / (1024 * 1024 * 1024))
      return NextResponse.json(
        {
          error: `Storage limit exceeded. You have ${remainingGB.toFixed(2)} GB remaining of your ${maxStorageGB} GB limit.`,
        },
        { status: 413 },
      )
    }

    // Validate file type
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

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json({ error: `File type "${fileType}" is not supported.` }, { status: 400 })
    }

    // Generate signed URL
    const bucketName = process.env.GCS_BUCKET_NAME || "xkreen-web-app"
    const gcsFileName = `${user.id}/${Date.now()}-${fileName}`

    const { signedUrl, publicUrl } = await generateSignedUploadUrl(bucketName, gcsFileName, fileType)

    console.log("[v0] Generated signed URL for:", gcsFileName)

    return NextResponse.json({
      signedUrl,
      publicUrl,
      gcsFileName,
      bucketName,
    })
  } catch (error) {
    console.error("[v0] Get upload URL error:", error)
    return NextResponse.json(
      { error: "Failed to generate upload URL", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
