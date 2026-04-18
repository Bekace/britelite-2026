import { NextRequest, NextResponse } from "next/server"
import { requireSuperAdminAPI } from "@/lib/admin/auth"

// PATCH update a bullet (label, sort_order, is_visible)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdminAPI()
  if ("error" in authResult && authResult.error !== null) return authResult
  const { supabase } = authResult

  const [body, { id }] = await Promise.all([request.json(), params])

  const updates: Record<string, unknown> = {}
  if (body.label !== undefined) updates.label = body.label.trim()
  if (body.sort_order !== undefined) updates.sort_order = body.sort_order
  if (body.is_visible !== undefined) updates.is_visible = body.is_visible

  const { data, error } = await supabase
    .from("plan_pricing_features")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

// DELETE a bullet
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireSuperAdminAPI()
  if ("error" in authResult && authResult.error !== null) return authResult
  const { supabase } = authResult

  const { id } = await params

  const { error } = await supabase
    .from("plan_pricing_features")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
