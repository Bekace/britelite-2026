import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/dashboard"

  if (code) {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if user has a subscription, if not create Free plan subscription
      const { data: existingSubscription } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", data.user.id)
        .single()

      if (!existingSubscription) {
        // Get Free plan
        const { data: freePlan } = await supabase
          .from("subscription_plans")
          .select("id")
          .eq("name", "Free")
          .eq("is_active", true)
          .single()

        if (freePlan) {
          // Get Free plan monthly price
          const { data: freePrice } = await supabase
            .from("subscription_prices")
            .select("id")
            .eq("plan_id", freePlan.id)
            .eq("billing_cycle", "monthly")
            .eq("is_active", true)
            .single()

          // Create subscription
          await supabase.from("user_subscriptions").insert({
            user_id: data.user.id,
            plan_id: freePlan.id,
            price_id: freePrice?.id,
            status: "active",
            started_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 100 years
          })
        }
      }

      // Redirect to the next URL
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // If there's an error or no code, redirect to login
  return NextResponse.redirect(new URL("/auth/login", requestUrl.origin))
}
