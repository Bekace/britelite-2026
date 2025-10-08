import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, tags } = body

    // Validate that at least one field is being updated
    if (!name && !tags) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Build update object
    const updateData: { name?: string; tags?: string[]; updated_at?: string } = {
      updated_at: new Date().toISOString(),
    }

    if (name) {
      updateData.name = name
    }

    if (tags) {
      // Parse tags if it's a string
      if (typeof tags === "string") {
        updateData.tags = tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      } else if (Array.isArray(tags)) {
        updateData.tags = tags
      }
    }

    // Update the media item
    const { data: media, error: updateError } = await supabase
      .from("media")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating media:", updateError)
      return NextResponse.json({ error: "Failed to update media" }, { status: 500 })
    }

    if (!media) {
      return NextResponse.json({ error: "Media not found or unauthorized" }, { status: 404 })
    }

    return NextResponse.json(media)
  } catch (error) {
    console.error("Error in PATCH /api/media/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
