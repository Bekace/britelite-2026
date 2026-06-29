import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { uploadToGCS } from "@/lib/gcs/rest-client"
import { Buffer } from "buffer"

// PATCH /api/restaurant-menus/items/[itemId]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const contentType = request.headers.get("content-type") || ""
    let updates: Record<string, any> = {}

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const allowed = ["name", "description", "price", "is_available", "is_featured", "position"]
      for (const key of allowed) {
        const val = formData.get(key)
        if (val !== null) {
          if (key === "is_available" || key === "is_featured") updates[key] = val === "true"
          else if (key === "position") updates[key] = parseInt(val as string)
          else updates[key] = val
        }
      }
      const tagsStr = formData.get("tags") as string | null
      if (tagsStr !== null) updates.tags = tagsStr ? JSON.parse(tagsStr) : []
      const vpStr = formData.get("variation_prices") as string | null
      if (vpStr !== null) updates.variation_prices = vpStr ? JSON.parse(vpStr) : {}

      // Handle image upload
      const imageFile = formData.get("image") as File | null
      if (imageFile && imageFile.size > 0) {
        const bucketName = process.env.GCS_BUCKET_NAME || "britelite-web-app"
        const filename = `menu-items/${user.id}/${Date.now()}-${imageFile.name}`
        const arrayBuffer = await imageFile.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        updates.image_url = await uploadToGCS(bucketName, filename, buffer, imageFile.type)
      }
    } else {
      const body = await request.json()
      const allowed = ["name", "description", "price", "image_url", "is_available", "is_featured", "tags", "variation_prices", "position"]
      for (const key of allowed) {
        if (key in body) updates[key] = body[key]
      }
    }

    const { data: item, error } = await supabase
      .from("menu_items")
      .update(updates)
      .eq("id", itemId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/restaurant-menus/items/[itemId]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { error } = await supabase.from("menu_items").delete().eq("id", itemId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
