import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// POST /api/restaurant-menus/[id]/sections — add a section
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: menu_id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Verify menu ownership
    const { data: menu } = await supabase
      .from("restaurant_menus")
      .select("id")
      .eq("id", menu_id)
      .eq("user_id", user.id)
      .single()
    if (!menu) return NextResponse.json({ error: "Menu not found" }, { status: 404 })

    const body = await request.json()
    const { name, description } = body
    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 })

    // Get next position
    const { count } = await supabase
      .from("menu_sections")
      .select("*", { count: "exact", head: true })
      .eq("menu_id", menu_id)

    const { data: section, error } = await supabase
      .from("menu_sections")
      .insert({ menu_id, name: name.trim(), description: description?.trim() || null, position: (count || 0) + 1 })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ section }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
