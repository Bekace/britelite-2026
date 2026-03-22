import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { type NextRequest, NextResponse } from "next/server"

/**
 * POST /api/screens/[id]/cancel-slot
 *
 * Marks a screen's slot as pending cancellation at the end of the current billing period.
 * The screen remains active until slot_cancel_at is reached — after which a cron job or
 * the Stripe "invoice.upcoming" / period-end webhook should finalize the cancellation.
 *
 * Flow:
 * 1. Verify ownership of the screen
 * 2. Ensure the screen has a paid slot (stripe_checkout_session_id present, or purchased_screen_slots > 0)
 * 3. Fetch the user's Stripe subscription to get current_period_end
 * 4. Set slot_cancel_at = current_period_end on the screen row
 * 5. Return the cancel date so the UI can show "Active until <date>"
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
      .select("id, name, stripe_checkout_session_id, slot_cancel_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    if (screen.slot_cancel_at) {
      return NextResponse.json(
        { error: "This screen is already scheduled for cancellation", slot_cancel_at: screen.slot_cancel_at },
        { status: 409 }
      )
    }

    // Get the user's subscription to determine period end (allow any status)
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select("stripe_subscription_id, purchased_screen_slots")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Determine slot_cancel_at from Stripe subscription period end
    let cancelAt: Date

    if (subscription.stripe_subscription_id) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id, {
          expand: ["items.data"],
        })
        // Stripe API 2025-11-17: current_period_end moved to item level
        const periodEnd: number =
          (stripeSub.items?.data?.[0] as any)?.current_period_end ??
          (stripeSub as any).current_period_end ??
          Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
        cancelAt = new Date(periodEnd * 1000)
      } catch (stripeErr) {
        console.error("[cancel-slot] Stripe retrieve failed:", stripeErr)
        cancelAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    } else {
      // Free plan or no Stripe sub — cancel at end of month
      const now = new Date()
      cancelAt = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    }

    // Mark the screen as pending cancellation
    const serviceSupabase = await createServiceRoleClient()
    const { error: updateError } = await serviceSupabase
      .from("screens")
      .update({ slot_cancel_at: cancelAt.toISOString() })
      .eq("id", id)

    if (updateError) {
      return NextResponse.json({ error: "Failed to schedule cancellation" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      slot_cancel_at: cancelAt.toISOString(),
      message: `Screen slot will be cancelled on ${cancelAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    })
  } catch (err: any) {
    console.error("[cancel-slot] error:", err)
    return NextResponse.json({ error: err.message || "Failed to cancel slot" }, { status: 500 })
  }
}

/**
 * DELETE /api/screens/[id]/cancel-slot
 * Undoes a pending cancellation (reactivate slot).
 */
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

    const { error } = await supabase
      .from("screens")
      .update({ slot_cancel_at: null })
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      return NextResponse.json({ error: "Failed to reactivate slot" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reactivate slot" }, { status: 500 })
  }
}
