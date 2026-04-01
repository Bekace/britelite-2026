import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { NextResponse } from "next/server"

/**
 * POST /api/stripe/confirm-screen-purchase
 *
 * Called when the user returns from Stripe Checkout with ?slot_purchased=true.
 * Reads last_credited_session_id from the DB (stored before the redirect),
 * verifies payment with Stripe, increments purchased_screen_slots, and stores
 * pending_slot_subscription_id so the slot survives if the wizard is closed.
 *
 * Uses last_credited_session_id for idempotency — safe to call multiple times.
 */
export async function POST(_request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Read the pending session ID stored in DB before the Stripe redirect
    const { data: userSub, error: subError } = await supabase
      .from("user_subscriptions")
      .select("id, purchased_screen_slots, last_credited_session_id, pending_slot_subscription_id")
      .eq("user_id", user.id)
      .single()

    if (subError || !userSub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 400 })
    }

    const sessionId = userSub.last_credited_session_id
    if (!sessionId) {
      return NextResponse.json({ error: "No pending slot purchase found" }, { status: 400 })
    }

    // Retrieve the Checkout Session from Stripe to verify it completed
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    })

    console.log(`[confirm-screen-purchase] session status: ${session.status}, payment_status: ${session.payment_status}, type: ${session.metadata?.type}`)

    // For subscription-mode sessions: status="complete" means payment succeeded.
    // payment_status can be "paid" or "no_payment_required" (e.g. trial periods).
    if (session.status !== "complete") {
      return NextResponse.json({ error: "Payment not completed yet" }, { status: 400 })
    }

    if (session.metadata?.type !== "screen_slot") {
      return NextResponse.json({ error: "Not a screen slot purchase" }, { status: 400 })
    }

    const subscription = session.subscription as import("stripe").Stripe.Subscription
    if (!subscription?.id) {
      return NextResponse.json({ error: "No subscription found in session" }, { status: 400 })
    }

    const priceId = subscription.items?.data?.[0]?.price?.id ?? null

    // Idempotency: check if this exact session was already credited via last_credited_session_id
    // We use a separate credited_session_id field to track what was actually processed
    const { data: freshSub } = await supabase
      .from("user_subscriptions")
      .select("purchased_screen_slots, pending_slot_subscription_id, last_credited_session_id")
      .eq("user_id", user.id)
      .single()

    const alreadyCredited = freshSub?.pending_slot_subscription_id === subscription.id

    if (!alreadyCredited) {
      const newSlotCount = (freshSub?.purchased_screen_slots ?? 0) + 1
      await supabase
        .from("user_subscriptions")
        .update({
          purchased_screen_slots: newSlotCount,
          pending_slot_subscription_id: subscription.id,
          // Clear last_credited_session_id so future calls don't re-process an old session
          last_credited_session_id: null,
        })
        .eq("user_id", user.id)

      console.log(`[confirm-screen-purchase] credited slot for user ${user.id}, new count: ${newSlotCount}, sub: ${subscription.id}`)
    } else {
      console.log(`[confirm-screen-purchase] already credited subscription ${subscription.id}, skipping`)
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      priceId,
    })
  } catch (err: any) {
    console.error("[confirm-screen-purchase] error:", err)
    return NextResponse.json({ error: err.message || "Failed to confirm purchase" }, { status: 500 })
  }
}
