import { type NextRequest, NextResponse } from "next/server"
import { requireSuperAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await requireSuperAdmin()
    const planData = await request.json()
    const planId = params.id

    const { data: updatedPlan, error } = await supabase
      .from("subscription_plans")
      .update(planData)
      .eq("id", planId)
      .select()
      .single()

    if (error) throw error

    await logAdminAction({
      action: "update_subscription_plan",
      targetType: "plan",
      targetId: planId,
      details: { name: planData.name, price: planData.price },
    })

    return NextResponse.json({ plan: updatedPlan })
  } catch (error) {
    console.error("[v0] Admin plan update error:", error)
    return NextResponse.json({ error: "Failed to update subscription plan" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase } = await requireSuperAdmin()
    const planId = params.id

    // Check if plan has active subscribers
    const { data: subscribers, error: checkError } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("plan_id", planId)
      .eq("status", "active")

    if (checkError) throw checkError

    if (subscribers && subscribers.length > 0) {
      return NextResponse.json({ error: "Cannot delete plan with active subscribers" }, { status: 400 })
    }

    const { error } = await supabase.from("subscription_plans").delete().eq("id", planId)

    if (error) throw error

    await logAdminAction({
      action: "delete_subscription_plan",
      targetType: "plan",
      targetId: planId,
      details: { timestamp: new Date().toISOString() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Admin plan deletion error:", error)
    return NextResponse.json({ error: "Failed to delete subscription plan" }, { status: 500 })
  }
}
