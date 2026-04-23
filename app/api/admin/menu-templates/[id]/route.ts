import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { uploadToGCS } from "@/lib/gcs/rest-client"
import { Buffer } from "buffer"

// GET /api/admin/menu-templates/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data: template, error } = await supabase
      .from("menu_templates")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !template) return NextResponse.json({ error: "Template not found" }, { status: 404 })
    return NextResponse.json({ template })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/admin/menu-templates/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const contentType = request.headers.get("content-type") || ""
    let updates: Record<string, any> = {}

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      if (formData.get("name")) updates.name = formData.get("name") as string
      if (formData.get("description")) updates.description = formData.get("description") as string
      if (formData.get("is_active") !== null) updates.is_active = formData.get("is_active") === "true"
      const layoutConfigStr = formData.get("layout_config") as string
      if (layoutConfigStr) {
        try {
          updates.layout_config = JSON.parse(layoutConfigStr)
          updates.orientation = updates.layout_config?.orientation || "landscape"
        } catch {
          return NextResponse.json({ error: "Invalid layout_config JSON" }, { status: 400 })
        }
      }
      // Handle thumbnail upload
      const thumbnailFile = formData.get("thumbnail") as File | null
      if (thumbnailFile && thumbnailFile.size > 0) {
        const bucketName = process.env.GCS_BUCKET_NAME || "xkreen-web-app"
        const filename = `menu-templates/${Date.now()}-${thumbnailFile.name}`
        const arrayBuffer = await thumbnailFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        updates.thumbnail_url = await uploadToGCS(bucketName, filename, buffer, thumbnailFile.type)
      }

      // Handle background image upload — inject real GCS URL into layout_config
      const bgImageFile = formData.get("bg_image") as File | null
      if (bgImageFile && bgImageFile.size > 0) {
        const bucketName = process.env.GCS_BUCKET_NAME || "xkreen-web-app"
        const filename = `menu-templates/bg/${Date.now()}-${bgImageFile.name}`
        const arrayBuffer = await bgImageFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const bgImageUrl = await uploadToGCS(bucketName, filename, buffer, bgImageFile.type)
        if (!updates.layout_config) updates.layout_config = {}
        updates.layout_config.background = {
          ...(updates.layout_config.background || {}),
          image_url: bgImageUrl,
          type: "image",
        }
      }
    } else {
      const body = await request.json()
      const { name, description, layout_config, is_active, thumbnail_url } = body
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (layout_config !== undefined) {
        updates.layout_config = layout_config
        updates.orientation = layout_config?.orientation || "landscape"
      }
      if (is_active !== undefined) updates.is_active = is_active
      if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url
    }

    updates.updated_at = new Date().toISOString()

    const { data: template, error } = await supabase
      .from("menu_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ template })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/admin/menu-templates/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { error } = await supabase.from("menu_templates").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
