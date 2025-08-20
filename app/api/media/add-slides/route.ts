import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { url, tags } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    // Validate Google Slides URL
    if (!url.includes("docs.google.com/presentation")) {
      return NextResponse.json({ error: "Invalid Google Slides URL" }, { status: 400 })
    }

    // Extract presentation name from URL or use a default
    let presentationName = "Google Slides Presentation"
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split("/")
      const presentationId = pathParts[pathParts.indexOf("d") + 1]
      if (presentationId) {
        presentationName = `Google Slides - ${presentationId.substring(0, 8)}`
      }
    } catch (error) {
      console.log("Could not extract presentation name, using default")
    }

    // Save metadata to Supabase
    const { data: mediaData, error: dbError } = await supabase
      .from("media")
      .insert({
        user_id: user.id,
        name: presentationName,
        file_path: url,
        file_size: 0, // Google Slides don't have a file size
        mime_type: "application/vnd.google-apps.presentation",
        tags: tags || [],
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json({ error: "Failed to save Google Slides metadata" }, { status: 500 })
    }

    return NextResponse.json({
      id: mediaData.id,
      name: presentationName,
      mime_type: "application/vnd.google-apps.presentation",
      file_size: 0,
      file_path: url,
      tags: mediaData.tags,
      created_at: mediaData.created_at,
    })
  } catch (error) {
    console.error("Add slides error:", error)
    return NextResponse.json({ error: "Failed to add Google Slides" }, { status: 500 })
  }
}
