import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"
import { NextResponse } from "next/server"

/**
 * POST /api/stripe/purchase-screen
 *
 * Creates a Stripe Checkout Session for purchasing one additional screen slot.
 * The session uses mode: "subscription" so the slot is billed monthly.
 * After successful payment Stripe redirects to /dashboard/screens?slot_purchased=true
 * and the webhook (checkout.session.completed with metadata.type=screen_slot)
 * records the new subscription ID ready for the screen wizard to use.
 *
 * Returns: { url } — the Stripe Checkout redirect URL.
 */
export async function POST(_request: Request) {
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

    console.log("[purchase-screen] subscription lookup:", {
      found: !!subscription,
      error: subError?.message,
      status: subscription?.status,
    })

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

    console.log("[purchase-screen] plan:", plan?.name)

    // Block Free plan users — they must upgrade before adding slots
    if (!plan || plan.name.toLowerCase() === "free") {
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

    console.log("[purchase-screen] monthly price:", {
      found: !!monthlyPriceRecord,
      error: priceError?.message,
      stripe_price_id: monthlyPriceRecord?.stripe_price_id,
    })

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.xkreen.com"

    console.log("[purchase-screen] creating Checkout Session for customer:", stripeCustomerId)

    // Create a Stripe Checkout Session — user pays, then returns to screens page
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [{ price: monthlyPriceRecord.stripe_price_id, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        metadata: {
          user_id: user.id,
          type: "screen_slot",
          plan_id: plan.id,
          plan_name: plan.name,
          user_subscription_id: subscription.id,
        },
      },
      success_url: `${siteUrl}/dashboard/screens?slot_purchased=true`,
      cancel_url: `${siteUrl}/dashboard/screens`,
      metadata: {
        user_id: user.id,
        type: "screen_slot",
        plan_id: plan.id,
        plan_name: plan.name,
        user_subscription_id: subscription.id,
      },
    })

    console.log("[purchase-screen] Checkout Session created:", session.id, "url:", session.url)

    // Store session.id in DB NOW before the redirect so confirm-screen-purchase
    // can look it up from the DB instead of relying on the URL parameter
    await supabase
      .from("user_subscriptions")
      .update({ last_credited_session_id: session.id })
      .eq("user_id", user.id)

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error("[purchase-screen] error:", err)
    return NextResponse.json({ error: err.message || "Failed to create screen slot checkout" }, { status: 500 })
  }
}
