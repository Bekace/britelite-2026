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
    .order("max_screens", { ascending: true })

  const { data: prices, error: pricesError } = await supabase
    .from("subscription_prices")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  // Fetch admin-managed pricing bullets (visible only)
  const { data: pricingBullets } = await supabase
    .from("plan_pricing_features")
    .select("plan_id, label, sort_order")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })

  if (plansError) {
    console.error("Error fetching plans:", plansError)
  }
  if (pricesError) {
    console.error("Error fetching prices:", pricesError)
  }

  // Group bullets by plan_id
  const bulletsByPlan: Record<string, string[]> = {}
  for (const bullet of pricingBullets ?? []) {
    if (!bulletsByPlan[bullet.plan_id]) bulletsByPlan[bullet.plan_id] = []
    bulletsByPlan[bullet.plan_id].push(bullet.label)
  }

  // Combine plans with their prices and admin-managed bullets
  const plansWithPrices =
    plans?.map((plan) => ({
      ...plan,
      prices: prices?.filter((price) => price.plan_id === plan.id) || [],
      features: {
        ...(plan.features ?? {}),
        // If admin has set bullets for this plan, use them; otherwise fall back to derived features
        ...(bulletsByPlan[plan.id]?.length ? { display_features: bulletsByPlan[plan.id] } : {}),
      },
    })) || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="https://xkreen.com/" className="flex items-center gap-2 text-foreground hover:text-foreground/80">
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
