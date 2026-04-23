import { type NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createServiceRoleClient } from "@/lib/supabase/server"
import type Stripe from "stripe"

export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // Screen slot purchase — store the new subscription ID so the screens page
        // can use it when the user creates their screen after returning from Stripe.
        if (session.metadata?.type === "screen_slot") {
          const userId = session.metadata?.user_id
          if (userId && session.subscription) {
            // Store pending slot subscription ID on the user_subscriptions row
            // so the confirm endpoint can hand it off to the screen wizard.
            await supabase
              .from("user_subscriptions")
              .update({ pending_slot_subscription_id: session.subscription.toString() })
              .eq("user_id", userId)
            console.log(`[webhook] screen_slot checkout complete, subscription ${session.subscription} for user ${userId}`)
          }
          break
        }

        let planId = session.metadata?.plan_id
        let priceId = session.metadata?.price_id
        const customerEmail = session.metadata?.email || session.customer_email

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription.toString())
          planId = subscription.metadata?.plan_id || planId
          priceId = subscription.metadata?.price_id || priceId
        }

        // Look up pending signup by stripe_session_id
        const { data: pendingSignup, error: pendingError } = await supabase
          .from("pending_signups")
          .select("*")
          .eq("stripe_session_id", session.id)
          .single()

        let userId: string | null = null

        if (pendingSignup) {
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
            console.error("Failed to create user:", authError)
            return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
          }

          userId = authData.user.id

          const { error: passwordError } = await supabase.rpc("set_user_password_hash", {
            user_id: userId,
            password_hash: pendingSignup.password_hash,
          })

          if (passwordError) {
            console.error("Failed to set password:", passwordError)
          }

          await supabase.from("profiles").update({ stripe_customer_id: session.customer?.toString() }).eq("id", userId)
          await supabase.from("pending_signups").delete().eq("id", pendingSignup.id)
        } else {
          if (session.customer) {
            const { data: existingSubscription } = await supabase
              .from("user_subscriptions")
              .select("user_id")
              .eq("stripe_customer_id", session.customer.toString())
              .single()

            if (existingSubscription) {
              userId = existingSubscription.user_id
            } else {
              const { data: profile } = await supabase
                .from("profiles")
                .select("id")
                .eq("stripe_customer_id", session.customer.toString())
                .single()

              if (profile) {
                userId = profile.id
              }
            }
          }

          if (!userId && customerEmail) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", customerEmail)
              .single()

            if (profile) {
              userId = profile.id

              if (session.customer) {
                await supabase
                  .from("profiles")
                  .update({ stripe_customer_id: session.customer.toString() })
                  .eq("id", userId)
              }
            }
          }

          if (!userId && session.customer) {
            try {
              const customer = await stripe.customers.retrieve(session.customer.toString())
              if (!customer.deleted && customer.email) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("id")
                  .eq("email", customer.email)
                  .single()

                if (profile) {
                  userId = profile.id
                  await supabase
                    .from("profiles")
                    .update({ stripe_customer_id: session.customer.toString() })
                    .eq("id", userId)
                }
              }
            } catch (error) {
              console.error("Failed to retrieve Stripe customer:", error)
            }
          }
        }

        if (userId && planId && priceId && session.subscription) {
          const { data: existingSub } = await supabase
            .from("user_subscriptions")
            .select("id, stripe_subscription_id")
            .eq("user_id", userId)
            .single()

          if (existingSub) {

            // Get trial info from price if available
            const { data: priceData } = await supabase
              .from("subscription_prices")
              .select("trial_days")
              .eq("id", priceId)
              .single()

            const trialDays = priceData?.trial_days || 0
            const now = new Date()
            const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null

            const updateData = {
              plan_id: planId,
              price_id: priceId,
              stripe_subscription_id: session.subscription.toString(),
              stripe_customer_id: session.customer?.toString(),
              status: trialDays > 0 ? "trialing" : "active",
              trial_ends_at: trialEnd?.toISOString() || null,
              started_at: now.toISOString(),
              expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: now.toISOString(),
            }

            console.log("[v0] Update data:", JSON.stringify(updateData, null, 2))

            const { data: updatedSub, error: updateError } = await supabase
              .from("user_subscriptions")
              .update(updateData)
              .eq("id", existingSub.id)
              .select()
              .single()

            if (updateError) {
              console.error("[v0] ❌ Failed to update subscription:", updateError)
              return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
            }

            // The upgrade payment = purchasing 1 screen slot.
            // Increment purchased_screen_slots by 1 so the user can create a new screen immediately.
            const { error: slotError } = await supabase.rpc("increment_purchased_screen_slots", {
              p_subscription_id: existingSub.id,
            })
            if (slotError) {
              console.error("[v0] Failed to grant screen slot on upgrade:", slotError)
            }
          } else {
            console.log("[v0] No existing subscription, creating new one")

            // Get trial info from price
            const { data: priceData } = await supabase
              .from("subscription_prices")
              .select("trial_days")
              .eq("id", priceId)
              .single()

            const trialDays = priceData?.trial_days || 0
            const now = new Date()
            const trialEnd = trialDays > 0 ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null

            console.log("[v0] Inserting subscription with userId:", userId, "planId:", planId, "priceId:", priceId)

            const { error: subError } = await supabase.from("user_subscriptions").insert({
              user_id: userId,
              plan_id: planId,
              price_id: priceId,
              stripe_subscription_id: session.subscription.toString(),
              stripe_customer_id: session.customer?.toString(),
              status: trialDays > 0 ? "trialing" : "active",
              trial_ends_at: trialEnd?.toISOString() || null,
              started_at: now.toISOString(),
              expires_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })

            if (subError) {
              console.error("Failed to create subscription:", subError)
            }
          }
        }

        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription

        // current_period_end moved to the item level in Stripe API 2025-11-17.
        // Fall back gracefully: item level → top level → 30 days from now.
        const periodEnd: number =
          (subscription.items?.data?.[0] as any)?.current_period_end ??
          (subscription as any).current_period_end ??
          Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

        const { error } = await supabase
          .from("user_subscriptions")
          .update({
            status: subscription.status,
            expires_at: new Date(periodEnd * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", subscription.id)

        if (error) {
          console.error("Failed to update subscription:", error)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        if (subscription.metadata?.type === "screen_slot") {
          // This is a screen slot subscription — delete the corresponding screen row
          const { data: screen } = await supabase
            .from("screens")
            .select("id, user_id")
            .eq("stripe_subscription_id", subscription.id)
            .single()

          if (screen) {
            await supabase.from("screens").delete().eq("id", screen.id)
            console.log(`[webhook] Screen slot deleted for subscription ${subscription.id}, screen ${screen.id}`)
          }
        } else {
          // This is a plan subscription — revert account to Free plan
          const { data: freePlan } = await supabase
            .from("subscription_plans")
            .select("id")
            .eq("name", "Free")
            .single()

          const { error } = await supabase
            .from("user_subscriptions")
            .update({
              status: "canceled",
              ...(freePlan ? { plan_id: freePlan.id } : {}),
            })
            .eq("stripe_subscription_id", subscription.id)

          if (error) {
            console.error("[webhook] Failed to cancel plan subscription:", error)
          }
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.subscription) break

        const subId = invoice.subscription.toString()

        // Check if this is a screen slot subscription
        const stripeSubData = await stripe.subscriptions.retrieve(subId).catch(() => null)
        if (stripeSubData?.metadata?.type === "screen_slot") {
          // Mark the associated screen as payment_failed
          await supabase
            .from("screens")
            .update({ slot_payment_status: "payment_failed" })
            .eq("stripe_subscription_id", subId)
          console.log(`[webhook] Payment failed for screen slot subscription ${subId}`)
        } else {
          // Plan subscription payment failed
          await supabase
            .from("user_subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subId)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.subscription) break
        const subId = invoice.subscription.toString()

        const stripeSubData = await stripe.subscriptions.retrieve(subId).catch(() => null)
        if (stripeSubData?.metadata?.type === "screen_slot") {
          // Clear payment_failed flag when payment recovers
          await supabase
            .from("screens")
            .update({ slot_payment_status: "active" })
            .eq("stripe_subscription_id", subId)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook handler error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
