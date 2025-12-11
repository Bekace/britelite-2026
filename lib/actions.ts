"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
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

    const { data: authData } = await supabase.auth.getUser()
    if (authData.user) {
      const { data: profile } = await supabase.from("profiles").select("deleted_at").eq("id", authData.user.id).single()

      if (profile?.deleted_at) {
        // Sign out the user immediately
        await supabase.auth.signOut()
        return { error: "This account has been deleted. Please contact support if you believe this is an error." }
      }
    }

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

  const isPaidPlan = !!stripePriceId

  try {
    if (isPaidPlan) {
      const adminSupabase = await createAdminClient()

      // Create user with admin client (auto-confirmed)
      const { data: adminAuthData, error: adminAuthError } = await adminSupabase.auth.admin.createUser({
        email: email.toString(),
        password: password.toString(),
        email_confirm: true, // Auto-confirm email for paid plans
        user_metadata: {
          full_name: fullName?.toString() || "",
          company_name: companyName?.toString() || "",
        },
      })

      if (adminAuthError) {
        return { error: adminAuthError.message }
      }

      if (!adminAuthData.user) {
        return { error: "Failed to create user account" }
      }

      const userId = adminAuthData.user.id

      // Sign the user in to establish session before Stripe redirect
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toString(),
        password: password.toString(),
      })

      if (signInError) {
        return { error: signInError.message }
      }

      // Create Stripe customer and checkout session
      const customer = await stripe.customers.create({
        email: email.toString(),
        name: fullName?.toString() || undefined,
        metadata: {
          supabase_user_id: userId,
          plan_id: planId?.toString() || "",
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
          plan_id: planId?.toString() || "",
          price_id: priceId?.toString() || "",
        },
      })

      // Store Stripe customer ID in profile
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

      return { error: "Failed to create checkout session" }
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://xkreen.vercel.app"}/auth/callback`,
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

    // For Free plan: Create subscription immediately
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
      // Get the price for this plan (using admin client to bypass RLS)
      const adminSupabase = await createAdminClient()
      const { data: planPrice } = await adminSupabase
        .from("subscription_prices")
        .select("id")
        .eq("plan_id", selectedPlanId)
        .eq("billing_cycle", "monthly")
        .eq("is_active", true)
        .single()

      await adminSupabase.from("user_subscriptions").insert({
        user_id: userId,
        plan_id: selectedPlanId,
        price_id: planPrice?.id || priceId?.toString(),
        status: "active",
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }

    // Update profile
    if (companyName) {
      const adminSupabase = await createAdminClient()
      await adminSupabase.from("profiles").update({ company_name: companyName.toString() }).eq("id", userId)
    }

    return {
      success: true,
      requiresVerification: true,
      message: "Please check your email to verify your account before logging in.",
    }
  } catch (error) {
    console.error("Signup error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const supabase = await createClient()

  await supabase.auth.signOut()
  redirect("/auth/login")
}
