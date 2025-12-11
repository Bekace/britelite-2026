"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Stripe from "stripe"
import bcrypt from "bcryptjs"

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

      // Check if email already exists in auth.users
      const { data: existingUsers } = await adminSupabase
        .from("profiles")
        .select("email")
        .eq("email", email.toString())
        .limit(1)

      if (existingUsers && existingUsers.length > 0) {
        return { error: "An account with this email already exists. Please log in." }
      }

      // Hash the password for storage
      const passwordHash = await bcrypt.hash(password.toString(), 12)

      // Delete any existing pending signup for this email
      await adminSupabase.from("pending_signups").delete().eq("email", email.toString())

      // Create Stripe customer first
      const customer = await stripe.customers.create({
        email: email.toString(),
        name: fullName?.toString() || undefined,
        metadata: {
          plan_id: planId?.toString() || "",
          price_id: priceId?.toString() || "",
        },
      })

      // Get trial days from the price
      const { data: priceData } = await adminSupabase
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
        cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://xkreen.vercel.app"}/pricing`,
        metadata: {
          plan_id: planId?.toString() || "",
          price_id: priceId?.toString() || "",
        },
      })

      // Store pending signup with stripe_session_id
      const { error: pendingError } = await adminSupabase.from("pending_signups").insert({
        email: email.toString(),
        password_hash: passwordHash,
        full_name: fullName?.toString() || null,
        company_name: companyName?.toString() || null,
        plan_id: planId?.toString() || null,
        price_id: priceId?.toString() || null,
        stripe_price_id: stripePriceId.toString(),
        stripe_session_id: session.id,
      })

      if (pendingError) {
        console.error("Failed to store pending signup:", pendingError)
        return { error: "Failed to process signup. Please try again." }
      }

      // Redirect to Stripe Checkout
      if (session.url) {
        redirect(session.url)
      }

      return { error: "Failed to create checkout session" }
    }

    // FREE PLAN: Require email verification
    const { data, error } = await supabase.auth.signUp({
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

    if (error) {
      return { error: error.message }
    }

    if (!data.user) {
      return { error: "Failed to create account" }
    }

    // For free plan, return success message to check email
    return {
      success: true,
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
