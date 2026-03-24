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

    // Retrieve the Checkout Session from Stripe to verify payment succeeded
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    })

    if (session.payment_status !== "paid") {
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

    // Idempotency: only increment if this session hasn't already been credited
    const alreadyCredited = userSub.pending_slot_subscription_id === subscription.id
    if (!alreadyCredited) {
      const newSlotCount = (userSub.purchased_screen_slots ?? 0) + 1
      await supabase
        .from("user_subscriptions")
        .update({
          purchased_screen_slots: newSlotCount,
          pending_slot_subscription_id: subscription.id,
          // Keep last_credited_session_id so re-opens still work but clear it
          // once the screen is finally created (handled in screens POST route)
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
