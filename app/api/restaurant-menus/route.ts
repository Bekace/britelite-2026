import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET /api/restaurant-menus — list user's menus
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: menus, error } = await supabase
      .from("restaurant_menus")
      .select(`
        *,
        menu_template:menu_templates(id, name, thumbnail_url, layout_config, orientation)
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ menus })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/restaurant-menus — create a new menu
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { name, description, template_id, brand_settings } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 })
    }

    const { data: menu, error } = await supabase
      .from("restaurant_menus")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        template_id: template_id || null,
        brand_settings: brand_settings || {},
        status: "draft",
      })
      .select(`
        *,
        menu_template:menu_templates(id, name, thumbnail_url, layout_config, orientation)
      `)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ menu }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
