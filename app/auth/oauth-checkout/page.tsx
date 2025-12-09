import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe"

export default async function OAuthCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string; priceId?: string; stripePriceId?: string }>
}) {
  const { planId, priceId, stripePriceId } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  if (!planId || !stripePriceId) {
    redirect("/auth/pricing")
  }

  // Check if user already has an active subscription
  const { data: existingSub } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing"])
    .single()

  if (existingSub) {
    redirect("/dashboard")
  }

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, full_name")
    .eq("id", user.id)
    .single()

  let stripeCustomerId = profile?.stripe_customer_id

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: profile?.full_name || user.user_metadata?.full_name || undefined,
      metadata: {
        supabase_user_id: user.id,
      },
    })
    stripeCustomerId = customer.id

    await supabase.from("profiles").update({ stripe_customer_id: stripeCustomerId }).eq("id", user.id)
  }

  // Get plan details for trial
  const { data: plan } = await supabase.from("subscription_plans").select("trial_days").eq("id", planId).single()

  // Create Stripe Checkout session
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${baseUrl}/dashboard?checkout=success`,
    cancel_url: `${baseUrl}/auth/pricing`,
    subscription_data: {
      trial_period_days: plan?.trial_days || undefined,
      metadata: {
        supabase_user_id: user.id,
        plan_id: planId,
        price_id: priceId || "",
      },
    },
    metadata: {
      supabase_user_id: user.id,
      plan_id: planId,
      price_id: priceId || "",
    },
  })

  if (session.url) {
    redirect(session.url)
  }

  redirect("/auth/pricing")
}
