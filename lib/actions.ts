"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
})

// Update the signIn function to handle redirects properly
export async function signIn(prevState: any, formData: FormData) {
  // Check if formData is valid
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  // Validate required fields
  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    // Return success instead of redirecting directly
    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Update the signUp function to handle potential null formData and plan assignment
export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const fullName = formData.get("fullName")
  const companyName = formData.get("companyName")
  const planId = formData.get("planId")
  const priceId = formData.get("priceId")
  const stripePriceId = formData.get("stripePriceId")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = await createClient()

  try {
    // Create auth user - no email confirmation required
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        // Skip email confirmation - user gets immediate access
        emailRedirectTo: undefined,
        data: {
          full_name: fullName?.toString() || "",
          company_name: companyName?.toString() || "",
        },
      },
    })

    if (authError) {
      return { error: authError.message }
    }

    if (!authData.user) {
      return { error: "Failed to create user account" }
    }

    const userId = authData.user.id

    // Check if this is a paid plan
    if (stripePriceId && planId) {
      // For paid plans: Create Stripe customer and checkout session
      const customer = await stripe.customers.create({
        email: email.toString(),
        name: fullName?.toString() || undefined,
        metadata: {
          supabase_user_id: userId,
          plan_id: planId.toString(),
          price_id: priceId?.toString() || "",
        },
      })

      // Get trial days from the price
      const { data: priceData } = await supabase
        .from("subscription_prices")
        .select("trial_days")
        .eq("id", priceId?.toString())
        .single()

      const trialDays = priceData?.trial_days || 0

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ["card"],
        line_items: [
          {
            price: stripePriceId.toString(),
            quantity: 1,
          },
        ],
        mode: "subscription",
        subscription_data: trialDays > 0 ? { trial_period_days: trialDays } : undefined,
        success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://xkreen.vercel.app"}/auth/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://xkreen.vercel.app"}/auth/pricing`,
        metadata: {
          supabase_user_id: userId,
          plan_id: planId.toString(),
          price_id: priceId?.toString() || "",
        },
      })

      // Store temporary data for the user (will be finalized by webhook)
      await supabase
        .from("profiles")
        .update({
          company_name: companyName?.toString() || null,
          stripe_customer_id: customer.id,
        })
        .eq("id", userId)

      // Redirect to Stripe Checkout
      if (session.url) {
        redirect(session.url)
      }
    }

    // For Free plan: Create subscription immediately and redirect to dashboard
    let selectedPlanId = planId?.toString()

    if (!selectedPlanId) {
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("name", "Free")
        .eq("is_active", true)
        .single()

      selectedPlanId = freePlan?.id
    }

    if (selectedPlanId) {
      // Get the price for this plan
      const { data: planPrice } = await supabase
        .from("subscription_prices")
        .select("id")
        .eq("plan_id", selectedPlanId)
        .eq("billing_cycle", "monthly")
        .eq("is_active", true)
        .single()

      await supabase.from("user_subscriptions").insert({
        user_id: userId,
        plan_id: selectedPlanId,
        price_id: planPrice?.id || priceId?.toString(),
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 100 years for free
      })
    }

    // Update profile
    if (companyName) {
      await supabase.from("profiles").update({ company_name: companyName.toString() }).eq("id", userId)
    }

    // Redirect to dashboard immediately (no email verification required)
    redirect("/dashboard")
  } catch (error) {
    // Check if this is a redirect (redirects throw NEXT_REDIRECT errors)
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error
    }
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const supabase = await createClient()

  await supabase.auth.signOut()
  redirect("/auth/login")
}
