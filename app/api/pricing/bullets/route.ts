export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Public endpoint — no auth required. Returns visible bullets per plan, sorted.
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("plan_pricing_features")
    .select("id, plan_id, label, sort_order")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Group by plan_id
  const grouped: Record<string, { id: string; label: string; sort_order: number }[]> = {}
  for (const row of data ?? []) {
    if (!grouped[row.plan_id]) grouped[row.plan_id] = []
    grouped[row.plan_id].push({ id: row.id, label: row.label, sort_order: row.sort_order })
  }

  return NextResponse.json(grouped)
}
