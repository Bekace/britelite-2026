export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import SignUpForm from "@/components/sign-up-form"
import Link from "next/link"
import { Check } from "lucide-react"

interface SignUpPageProps {
  params: Promise<{
    planId: string
  }>
  searchParams: Promise<{
    billing?: string
    priceId?: string
  }>
}

function getDisplayFeatures(features: Record<string, unknown> | null): string[] {
  if (!features) return []

  const displayFeatures: string[] = []

  if (features.max_screens !== undefined) {
    const screens = features.max_screens as number
    displayFeatures.push(screens === -1 ? "Unlimited screens" : `Up to ${screens} screens`)
  }
  if (features.max_playlists !== undefined) {
    const playlists = features.max_playlists as number
    displayFeatures.push(playlists === -1 ? "Unlimited playlists" : `${playlists} playlists`)
  }
  if (features.max_media_storage_mb !== undefined) {
    const storageMB = features.max_media_storage_mb as number
    if (storageMB === -1) {
      displayFeatures.push("Unlimited storage")
    } else if (storageMB >= 1024) {
      displayFeatures.push(`${Math.round(storageMB / 1024)}GB storage`)
    } else {
      displayFeatures.push(`${storageMB}MB storage`)
    }
  }

  return displayFeatures
}

export default async function SignUpWithPlanPage({ params, searchParams }: SignUpPageProps) {
  const { planId } = await params
  const { billing = "monthly", priceId } = await searchParams

  const supabase = await createClient()

  // Check if user is already logged in
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  const { data: plan, error } = await supabase.from("subscription_plans").select("*").eq("id", planId).single()

  if (error || !plan) {
    redirect("/auth/pricing")
  }

  const { data: prices } = await supabase
    .from("subscription_prices")
    .select("*")
    .eq("plan_id", planId)
    .eq("is_active", true)

  // Find the selected price based on billing cycle or priceId
  const selectedPrice = prices?.find((p) => (priceId ? p.id === priceId : p.billing_cycle === billing)) || prices?.[0]

  // Convert features JSON to display array
  const displayFeatures = getDisplayFeatures(plan.features as Record<string, unknown>)

  // Create the plan object with display-friendly format
  const planWithPrice = {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: selectedPrice?.price || 0,
    billing_cycle: selectedPrice?.billing_cycle || billing,
    features: displayFeatures,
    priceId: selectedPrice?.id,
    stripePriceId: selectedPrice?.stripe_price_id,
    trialDays: selectedPrice?.trial_days || 0,
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Logo Header */}
      <div className="border-b border-border px-6 py-4">
        <Link href="/auth/pricing" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          {/* Light mode logo */}
          <img src="/britelite-logo-light.svg" alt="XKREEN" className="h-6 w-auto block dark:hidden" />
          {/* Dark mode logo */}
          <img src="/britelite-logo.svg" alt="XKREEN" className="h-6 w-auto hidden dark:block" />
        </Link>
      </div>

      {/* Main content - stacks on mobile, 2 columns on desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* Plan Card - full width on mobile, 40% on desktop */}
        <div className="w-full md:w-2/5 md:border-r border-b md:border-b-0 border-border px-4 py-6 md:p-8 flex items-center justify-center bg-muted/30 md:overflow-y-auto">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-sm space-y-6">
            {/* Plan Header */}
            <div>
              <p className="text-sm text-muted-foreground mb-1">Selected Plan</p>
              <h2 className="text-2xl font-semibold text-foreground">{planWithPrice.name}</h2>
            </div>

            {/* Pricing */}
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">${planWithPrice.price}</span>
              <span className="text-muted-foreground">/{planWithPrice.billing_cycle}</span>
            </div>

            {/* Trial Info */}
            {planWithPrice.trialDays && planWithPrice.trialDays > 0 && (
              <p className="text-sm text-primary font-medium">{planWithPrice.trialDays}-day free trial included</p>
            )}

            {/* Features */}
            <div className="space-y-3">
              {displayFeatures.map((feature: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3">
                  <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            {/* Change Plan Link */}
            <Link href="/auth/pricing" className="text-sm text-primary hover:underline block pt-2">
              Change plan
            </Link>
          </div>
        </div>

        {/* Sign-up Form - full width on mobile, 60% on desktop */}
        <div className="w-full md:w-3/5 px-4 py-6 md:p-8 flex items-start md:items-center justify-center md:overflow-y-auto">
          <div className="w-full max-w-md">
            <SignUpForm selectedPlan={planWithPrice} />
          </div>
        </div>
      </div>
    </div>
  )
}
