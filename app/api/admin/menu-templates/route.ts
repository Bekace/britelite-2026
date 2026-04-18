import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { uploadToGCS } from "@/lib/gcs/rest-client"
import { Buffer } from "buffer"

// GET /api/admin/menu-templates — list all templates
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data: templates, error } = await supabase
      .from("menu_templates")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ templates })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/menu-templates — create a new template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const contentType = request.headers.get("content-type") || ""

    let name: string
    let description: string | undefined
    let layout_config: object
    let is_active: boolean = true
    let thumbnail_url: string | undefined

    if (contentType.includes("multipart/form-data")) {
      // Handle form data with optional thumbnail upload
      const formData = await request.formData()
      name = formData.get("name") as string
      description = formData.get("description") as string | undefined
      const layoutConfigStr = formData.get("layout_config") as string
      is_active = formData.get("is_active") === "true"

      if (!name || !layoutConfigStr) {
        return NextResponse.json({ error: "name and layout_config are required" }, { status: 400 })
      }

      try {
        layout_config = JSON.parse(layoutConfigStr)
      } catch {
        return NextResponse.json({ error: "Invalid layout_config JSON" }, { status: 400 })
      }

      // Handle thumbnail upload
      const thumbnailFile = formData.get("thumbnail") as File | null
      if (thumbnailFile && thumbnailFile.size > 0) {
        const bucketName = process.env.GCS_BUCKET_NAME || "xkreen-web-app"
        const filename = `menu-templates/${Date.now()}-${thumbnailFile.name}`
        const arrayBuffer = await thumbnailFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        thumbnail_url = await uploadToGCS(bucketName, filename, buffer, thumbnailFile.type)
      }
    } else {
      // Handle JSON body
      const body = await request.json()
      name = body.name
      description = body.description
      layout_config = body.layout_config
      is_active = body.is_active ?? true
      thumbnail_url = body.thumbnail_url
    }

    if (!name || !layout_config) {
      return NextResponse.json({ error: "name and layout_config are required" }, { status: 400 })
    }

    const orientation = (layout_config as any)?.orientation || "landscape"

    const { data: template, error } = await supabase
      .from("menu_templates")
      .insert({ name, description, layout_config, orientation, is_active, thumbnail_url })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
