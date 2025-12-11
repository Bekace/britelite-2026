import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"

// Initialize Supabase with service role for webhook processing
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log("[v0] Webhook event received:", event.type)

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const planId = session.metadata?.plan_id
        const priceId = session.metadata?.price_id
        const customerEmail = session.metadata?.email || session.customer_email

        // Look up pending signup by stripe_session_id
        const { data: pendingSignup, error: pendingError } = await supabase
          .from("pending_signups")
          .select("*")
          .eq("stripe_session_id", session.id)
          .single()

        let userId: string | null = null

        if (pendingSignup) {
          console.log("[v0] Found pending signup for:", pendingSignup.email)

          // Create user in Supabase Auth with admin API
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: pendingSignup.email,
            email_confirm: true,
            user_metadata: {
              full_name: pendingSignup.full_name || "",
              company_name: pendingSignup.company_name || "",
            },
          })

          if (authError) {
            console.error("[v0] Failed to create user:", authError)
            return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
          }

          userId = authData.user.id

          // Update password hash directly in auth.users
          const { error: passwordError } = await supabase.rpc("set_user_password_hash", {
            user_id: userId,
            password_hash: pendingSignup.password_hash,
          })

          if (passwordError) {
            console.error("[v0] Failed to set password:", passwordError)
            // Continue anyway - user can reset password
          }

          console.log("[v0] Created user:", userId)

          // Update profile with Stripe customer ID
          await supabase
            .from("profiles")
            .update({
              company_name: pendingSignup.company_name,
              stripe_customer_id: session.customer?.toString(),
            })
            .eq("id", userId)

          // Delete pending signup record
          await supabase.from("pending_signups").delete().eq("id", pendingSignup.id)
          console.log("[v0] Deleted pending signup record")
        } else {
          console.log("[v0] No pending signup found, looking up existing user by email:", customerEmail)

          if (customerEmail) {
            const { data: profile } = await supabase.from("profiles").select("id").eq("email", customerEmail).single()

            if (profile) {
              userId = profile.id
              console.log("[v0] Found existing user:", userId)

              // Update profile with Stripe customer ID
              await supabase
                .from("profiles")
                .update({ stripe_customer_id: session.customer?.toString() })
                .eq("id", userId)
            } else {
              console.error("[v0] No user found for email:", customerEmail)
            }
          }
        }

        if (userId && planId && session.subscription) {
          // Check if subscription already exists
          const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("id")
            .eq("stripe_subscription_id", session.subscription.toString())
            .single()

          if (existingSub) {
            console.log("[v0] Subscription already exists, skipping creation")
          } else {
            // Get trial info from price
            const { data: priceData } = await supabase
              .from("subscription_prices")
              .select("trial_days")
              .eq("id", priceId)
              .single()

            const trialDays = priceData?.trial_days || 0
            const now = new Date()
            const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null

            const { error: subError } = await supabase.from("user_subscriptions").insert({
              user_id: userId,
              plan_id: planId,
              price_id: priceId,
              stripe_subscription_id: session.subscription.toString(),
              stripe_customer_id: session.customer?.toString(),
              status: trialDays > 0 ? "trialing" : "active",
              trial_ends_at: trialEnd?.toISOString() || null,
              current_period_start: now.toISOString(),
              current_period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })

            if (subError) {
              console.error("[v0] Failed to create subscription:", subError)
            } else {
              console.log("[v0] Created subscription for user:", userId)
            }
          }
        } else {
          console.error(
            "[v0] Missing data for subscription - userId:",
            userId,
            "planId:",
            planId,
            "subscription:",
            session.subscription,
          )
        }

        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.user_id

        if (userId) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("stripe_subscription_id", subscription.id)

          console.log("[v0] Subscription updated:", subscription.id, subscription.status)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        await supabase
          .from("user_subscriptions")
          .update({
            status: "canceled",
            ended_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id)

        console.log("[v0] Subscription canceled:", subscription.id)
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: "active",
              payment_method: "card", // Can be enhanced to show card details
            })
            .eq("stripe_subscription_id", invoice.subscription.toString())

          console.log("[v0] Payment succeeded for subscription:", invoice.subscription)
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: "past_due",
            })
            .eq("stripe_subscription_id", invoice.subscription.toString())

          console.log("[v0] Payment failed for subscription:", invoice.subscription)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
