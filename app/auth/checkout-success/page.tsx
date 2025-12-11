import { redirect } from "next/navigation"
import { createClient, createAdminClient } from "@/lib/supabase/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
})

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const params = await searchParams
  const sessionId = params.session_id

  if (!sessionId) {
    redirect("/auth/pricing")
  }

  // Get the Stripe checkout session to find the user
  let stripeSession
  try {
    stripeSession = await stripe.checkout.sessions.retrieve(sessionId)
  } catch (error) {
    console.error("Failed to retrieve Stripe session:", error)
    redirect("/auth/pricing?error=invalid_session")
  }

  // Get user ID from Stripe metadata
  const userId = stripeSession.metadata?.supabase_user_id

  if (!userId) {
    console.error("No user ID in Stripe session metadata")
    redirect("/auth/login?error=no_user")
  }

  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  // Check if user already has a session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // User not signed in - we need to create a magic link or redirect to login
    // Since the user was created with a password, redirect to login with a success message

    // First verify the user exists and payment was successful
    const { data: profile } = await adminSupabase.from("profiles").select("email").eq("id", userId).single()

    if (!profile) {
      redirect("/auth/login?error=no_profile")
    }

    // Redirect to login with success message - user needs to sign in
    redirect(`/auth/login?checkout=success&email=${encodeURIComponent(profile.email || "")}`)
  }

  // User is signed in, redirect to dashboard with welcome
  redirect("/dashboard?welcome=true")
}
