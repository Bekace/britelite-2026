import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// PATCH /api/restaurant-menus/sections/[sectionId]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sectionId: string }> }) {
  try {
    const { sectionId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const allowed = ["name", "description", "position", "is_visible"]
    const updates: Record<string, any> = {}
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    const { data: section, error } = await supabase
      .from("menu_sections")
      .update(updates)
      .eq("id", sectionId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ section })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/restaurant-menus/sections/[sectionId]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ sectionId: string }> }) {
  try {
    const { sectionId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { error } = await supabase.from("menu_sections").delete().eq("id", sectionId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
