import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdminAPI } from "@/lib/admin/auth"

// GET all pricing bullets grouped by plan
export async function GET() {
  const authResult = await requireSuperAdminAPI()
  if ("error" in authResult && authResult.error !== null) return authResult
  const { supabase } = authResult

  const { data, error } = await supabase
    .from("plan_pricing_features")
    .select(`
      id,
      plan_id,
      label,
      sort_order,
      is_visible,
      created_at,
      subscription_plans(id, name)
    `)
    .order("plan_id")
    .order("sort_order")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// POST create a new bullet
export async function POST(request: NextRequest) {
  const authResult = await requireSuperAdminAPI()
  if ("error" in authResult && authResult.error !== null) return authResult
  const { supabase } = authResult

  const body = await request.json()
  const { plan_id, label, sort_order, is_visible } = body

  if (!plan_id || !label?.trim()) {
    return NextResponse.json({ error: "plan_id and label are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("plan_pricing_features")
    .insert({
      plan_id,
      label: label.trim(),
      sort_order: sort_order ?? 0,
      is_visible: is_visible ?? true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
