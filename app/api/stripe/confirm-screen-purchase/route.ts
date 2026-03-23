import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { NextResponse } from "next/server"

/**
 * POST /api/stripe/confirm-screen-purchase
 * Called when the user returns from Stripe Checkout with ?session_id=xxx&slot_purchased=true
 * Verifies payment succeeded with Stripe and returns the slot subscription ID + price ID
 * so the screens page wizard can create the screen row properly.
 */
export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session ID" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Retrieve the Checkout Session from Stripe to verify payment
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    })

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 })
    }

    // Confirm this session belongs to this user
    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 })
    }

    if (session.metadata?.type !== "screen_slot") {
      return NextResponse.json({ error: "Not a screen slot purchase" }, { status: 400 })
    }

    const subscription = session.subscription as import("stripe").Stripe.Subscription
    if (!subscription?.id) {
      return NextResponse.json({ error: "No subscription found in session" }, { status: 400 })
    }

    // Get the price ID from the subscription item
    const priceId = subscription.items?.data?.[0]?.price?.id ?? null

    // Clear the pending_slot_subscription_id now that the screen page has confirmed it
    await supabase
      .from("user_subscriptions")
      .update({ pending_slot_subscription_id: null })
      .eq("user_id", user.id)

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
