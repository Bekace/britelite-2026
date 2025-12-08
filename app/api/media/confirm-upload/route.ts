import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { makeFilePublic } from "@/lib/gcs/rest-client"

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

    const { fileName, fileSize, fileType, publicUrl, gcsFileName, bucketName, tags } = await request.json()

    if (!fileName || !fileSize || !publicUrl || !gcsFileName || !bucketName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] Confirming upload:", { fileName, gcsFileName })

    // Make the file public
    try {
      await makeFilePublic(bucketName, gcsFileName)
      console.log("[v0] File made public:", gcsFileName)
    } catch (error) {
      console.error("[v0] Failed to make file public:", error)
      // Continue anyway - file might still be accessible
    }

    // Save metadata to Supabase
    const { data: insertedMediaData, error: dbError } = await supabase
      .from("media")
      .insert({
        user_id: user.id,
        name: fileName,
        file_path: publicUrl,
        file_size: fileSize,
        mime_type: fileType,
        tags: tags ? (typeof tags === "string" ? tags.split(",").map((tag: string) => tag.trim()) : tags) : [],
      })
      .select()
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)
      return NextResponse.json({ error: "Failed to save media metadata" }, { status: 500 })
    }

    console.log("[v0] Upload confirmed:", insertedMediaData.id)

    return NextResponse.json({
      id: insertedMediaData.id,
      name: fileName,
      mime_type: fileType,
      file_size: fileSize,
      file_path: publicUrl,
      tags: insertedMediaData.tags,
      created_at: insertedMediaData.created_at,
    })
  } catch (error) {
    console.error("[v0] Confirm upload error:", error)
    return NextResponse.json(
      { error: "Failed to confirm upload", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
