import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// POST /api/restaurant-menus/sections/[sectionId]/items — add an item
export async function POST(request: NextRequest, { params }: { params: Promise<{ sectionId: string }> }) {
  try {
    const { sectionId: section_id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const {
      name, description, price, image_url,
      is_available = true, is_featured = false,
      tags = [], variation_prices = {},
    } = body

    if (!name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const { count } = await supabase
      .from("menu_items")
      .select("*", { count: "exact", head: true })
      .eq("section_id", section_id)

    const { data: item, error } = await supabase
      .from("menu_items")
      .insert({
        section_id,
        name: name.trim(),
        description: description?.trim() || null,
        price: price?.trim() || null,
        image_url: image_url || null,
        is_available,
        is_featured,
        tags,
        variation_prices,
        position: (count || 0) + 1,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
