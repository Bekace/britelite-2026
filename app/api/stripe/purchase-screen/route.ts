import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { NextResponse } from "next/server"

/**
 * POST /api/stripe/purchase-screen
 *
 * Creates a dedicated monthly Stripe subscription for one additional screen slot.
 * Slots are always billed monthly regardless of whether the plan is annual.
 * The price used is the monthly rate of the user's current plan at time of purchase
 * (locked in — if user upgrades plan later, existing slots retain the old price).
 *
 * Returns:
 *   - { success, subscriptionId, priceId, status: "active" }  when no payment action needed
 *   - { success, subscriptionId, priceId, clientSecret }       when card confirmation required
 *
 * The screens page creates the screen row AFTER receiving success, passing
 * stripe_subscription_id and stripe_price_id so the slot is fully tracked.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("[purchase-screen] auth failed:", userError?.message)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("[purchase-screen] user authenticated:", user.id)

    // Get user's active subscription with plan details
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select(`
        id,
        stripe_subscription_id,
        stripe_customer_id,
        plan_id,
        status,
        subscription_plans (
          id,
          name,
          free_screens
        )
      `)
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single()

    console.log("[purchase-screen] subscription lookup:", { found: !!subscription, error: subError?.message, status: subscription?.status })

    if (subError || !subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 })
    }

    // Supabase returns joined relations as an array — extract the first element
    const planRaw = subscription.subscription_plans
    const plan = (Array.isArray(planRaw) ? planRaw[0] : planRaw) as {
      id: string
      name: string
      free_screens: number
    }

    // Block Free plan users — they must upgrade before adding slots
    if (plan.name.toLowerCase() === "free") {
      return NextResponse.json(
        { error: "Free plan users cannot add screen slots. Please upgrade your plan first." },
        { status: 403 }
      )
    }

    // Get the monthly price for the current plan (slots are ALWAYS monthly)
    const { data: monthlyPriceRecord, error: priceError } = await supabase
      .from("subscription_prices")
      .select("stripe_price_id, price")
      .eq("plan_id", plan.id)
      .eq("billing_cycle", "monthly")
      .eq("is_active", true)
      .single()

    if (priceError || !monthlyPriceRecord?.stripe_price_id) {
      return NextResponse.json(
        { error: "No monthly price configured for your plan. Please contact support." },
        { status: 400 }
      )
    }

    const stripeCustomerId = subscription.stripe_customer_id
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found for your account. Please contact support." },
        { status: 400 }
      )
    }

    console.log("[purchase-screen] creating slot subscription for customer:", stripeCustomerId, "price:", monthlyPriceRecord.stripe_price_id)

    // Create a new Stripe subscription for this slot — one subscription per screen
    const slotSubscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: monthlyPriceRecord.stripe_price_id }],
      metadata: {
        user_id: user.id,
        subscription_id: subscription.id,
        type: "screen_slot",
        plan_id: plan.id,
        plan_name: plan.name,
      },
      payment_behavior: "default_incomplete",
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      expand: ["latest_invoice.payment_intent"],
    })

    const latestInvoice = slotSubscription.latest_invoice as import("stripe").Stripe.Invoice
    const paymentIntent = latestInvoice?.payment_intent as import("stripe").Stripe.PaymentIntent | null

    // If the customer already has a valid default payment method Stripe may
    // activate the subscription immediately without requiring further action
    if (slotSubscription.status === "active") {
      return NextResponse.json({
        success: true,
        subscriptionId: slotSubscription.id,
        priceId: monthlyPriceRecord.stripe_price_id,
        status: "active",
        requiresAction: false,
      })
    }

    return NextResponse.json({
      success: true,
      subscriptionId: slotSubscription.id,
      priceId: monthlyPriceRecord.stripe_price_id,
      status: slotSubscription.status,
      requiresAction: paymentIntent?.status === "requires_action",
      clientSecret: paymentIntent?.client_secret ?? null,
    })
  } catch (err: any) {
    console.error("[purchase-screen] error:", err)
    return NextResponse.json({ error: err.message || "Failed to create screen slot subscription" }, { status: 500 })
  }
}
