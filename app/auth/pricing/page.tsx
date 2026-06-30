export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import PricingCards from "@/components/pricing-cards"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default async function PricingPage() {
  const supabase = await createClient()

  // Check if user is already logged in
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  const { data: plans, error: plansError } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  if (plansError) {
    console.error("Error fetching plans:", plansError)
  }

  // Build synthetic prices array from plan's own price_monthly / price_yearly fields
  // so PricingCards can use its existing billing-cycle logic
  const plansWithPrices =
    plans?.map((plan) => {
      const prices = []
      if (plan.price_monthly != null) {
        prices.push({
          id: `${plan.id}-monthly`,
          plan_id: plan.id,
          billing_cycle: "monthly" as const,
          price: Number(plan.price_monthly),
          stripe_price_id: plan.stripe_price_id_monthly ?? null,
          trial_days: 0,
          is_active: true,
        })
      }
      if (plan.price_yearly != null) {
        prices.push({
          id: `${plan.id}-yearly`,
          plan_id: plan.id,
          billing_cycle: "yearly" as const,
          price: Number(plan.price_yearly),
          stripe_price_id: plan.stripe_price_id_yearly ?? null,
          trial_days: 0,
          is_active: true,
        })
      }

      // Derive display_features from the plan's features JSON array (stored as a JSON array of strings)
      const rawFeatures = plan.features
      const displayFeatures: string[] = Array.isArray(rawFeatures)
        ? rawFeatures
        : typeof rawFeatures === "object" && rawFeatures !== null
          ? (rawFeatures as Record<string, unknown>).display_features as string[] ?? []
          : []

      return {
        ...plan,
        is_recommended: plan.is_popular ?? false,
        max_media_storage: plan.max_storage_mb ?? 0,
        prices,
        features: {
          display_features: displayFeatures,
        },
      }
    }) || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="https://new2.britelitedigital.com/" className="flex items-center gap-2 text-foreground hover:text-foreground/80">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
          <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
            Already have an account? <span className="text-primary">Sign in</span>
          </Link>
        </div>
      </header>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl font-bold text-foreground">Plans and Pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your digital signage needs. Start free and upgrade as you grow.
          </p>
        </div>

        <PricingCards plans={plansWithPrices} />
      </section>
    </div>
  )
}
