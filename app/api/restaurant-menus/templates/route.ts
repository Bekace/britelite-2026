import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// GET /api/restaurant-menus/templates — list active templates for users
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: templates, error } = await supabase
      .from("menu_templates")
      .select("id, name, description, thumbnail_url, layout_config, orientation, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ templates })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
