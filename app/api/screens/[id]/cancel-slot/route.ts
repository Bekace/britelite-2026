import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { type NextRequest, NextResponse } from "next/server"

/**
 * POST /api/screens/[id]/cancel-slot
 *
 * Schedules a screen slot subscription to cancel at the end of its current
 * billing period. Uses Stripe cancel_at_period_end on the slot's OWN subscription
 * (each extra screen now has its own stripe_subscription_id).
 *
 * For legacy screens (no stripe_subscription_id) or free slots (is_free_slot=true),
 * cancellation is app-side only — set to end of current month.
 *
 * DELETE /api/screens/[id]/cancel-slot
 * Undoes a pending cancellation by calling cancel_at_period_end=false in Stripe.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch the screen — must belong to this user
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("id, name, stripe_subscription_id, slot_cancel_at, is_free_slot")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    if (screen.slot_cancel_at) {
      return NextResponse.json(
        { error: "This screen is already scheduled for cancellation.", slot_cancel_at: screen.slot_cancel_at },
        { status: 409 }
      )
    }

    let cancelAt: Date

    if (screen.stripe_subscription_id) {
      // Paid slot — cancel the slot's own Stripe subscription at period end
      const updated = await stripe.subscriptions.update(screen.stripe_subscription_id, {
        cancel_at_period_end: true,
      })

      // Stripe API 2025-11-17: current_period_end moved to item level
      const periodEnd: number =
        (updated.items?.data?.[0] as any)?.current_period_end ??
        (updated as any).current_period_end ??
        Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

      cancelAt = new Date(periodEnd * 1000)
    } else {
      // Free slot or legacy slot with no Stripe record — cancel at end of current month
      const now = new Date()
      cancelAt = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    }

    // Persist cancel date on the screen row using service role to bypass RLS
    const serviceSupabase = await createServiceRoleClient()
    const { error: updateError } = await serviceSupabase
      .from("screens")
      .update({ slot_cancel_at: cancelAt.toISOString() })
      .eq("id", id)

    if (updateError) {
      // Undo Stripe cancellation if DB update failed
      if (screen.stripe_subscription_id) {
        await stripe.subscriptions.update(screen.stripe_subscription_id, {
          cancel_at_period_end: false,
        }).catch(() => {})
      }
      return NextResponse.json({ error: "Failed to schedule cancellation" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      slot_cancel_at: cancelAt.toISOString(),
      message: `"${screen.name}" will remain active until ${cancelAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}, then the slot will be cancelled.`,
    })
  } catch (err: any) {
    console.error("[cancel-slot POST] error:", err)
    return NextResponse.json({ error: err.message || "Failed to cancel slot" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: screen } = await supabase
      .from("screens")
      .select("id, stripe_subscription_id, slot_cancel_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (!screen?.slot_cancel_at) {
      return NextResponse.json({ error: "No pending cancellation found" }, { status: 400 })
    }

    // Reactivate in Stripe if this slot has its own subscription
    if (screen.stripe_subscription_id) {
      await stripe.subscriptions.update(screen.stripe_subscription_id, {
        cancel_at_period_end: false,
      })
    }

    const { error } = await supabase
      .from("screens")
      .update({ slot_cancel_at: null })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: "Failed to reactivate slot" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Cancellation undone. Your screen slot remains active." })
  } catch (err: any) {
    console.error("[cancel-slot DELETE] error:", err)
    return NextResponse.json({ error: err.message || "Failed to reactivate slot" }, { status: 500 })
  }
}
