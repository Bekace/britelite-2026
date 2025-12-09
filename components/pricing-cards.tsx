"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "lucide-react"
import Link from "next/link"

type Plan = {
  id: string
  name: string
  description: string
  price: number
  billing_cycle: string
  max_screens: number
  max_playlists: number
  max_media_storage: number
  features: any // Can be object or array
}

interface PricingCardsProps {
  plans: Plan[]
}

function extractFeatures(plan: Plan): string[] {
  // If features is already an array, return it
  if (Array.isArray(plan.features)) {
    return plan.features
  }

  // If features has display_features array, use that
  if (plan.features?.display_features && Array.isArray(plan.features.display_features)) {
    return plan.features.display_features
  }

  // Otherwise, build features from plan limits
  const displayFeatures: string[] = []

  if (plan.max_screens) {
    displayFeatures.push(
      plan.max_screens === -1 ? "Unlimited screens" : `${plan.max_screens} screen${plan.max_screens > 1 ? "s" : ""}`,
    )
  }

  if (plan.max_playlists) {
    displayFeatures.push(
      plan.max_playlists === -1
        ? "Unlimited playlists"
        : `${plan.max_playlists} playlist${plan.max_playlists > 1 ? "s" : ""}`,
    )
  }

  if (plan.max_media_storage) {
    displayFeatures.push(`${plan.max_media_storage}GB storage`)
  }

  // Add from features object if available
  if (plan.features && typeof plan.features === "object") {
    if (plan.features.max_screens) {
      const screens = plan.features.max_screens
      if (!displayFeatures.some((f) => f.includes("screen"))) {
        displayFeatures.push(screens === -1 ? "Unlimited screens" : `${screens} screen${screens > 1 ? "s" : ""}`)
      }
    }
    if (plan.features.max_playlists) {
      const playlists = plan.features.max_playlists
      if (!displayFeatures.some((f) => f.includes("playlist"))) {
        displayFeatures.push(
          playlists === -1 ? "Unlimited playlists" : `${playlists} playlist${playlists > 1 ? "s" : ""}`,
        )
      }
    }
    if (plan.features.max_media_assets) {
      const assets = plan.features.max_media_assets
      displayFeatures.push(assets === -1 ? "Unlimited media assets" : `${assets} media assets`)
    }
    if (plan.features.max_media_storage_mb) {
      const storageGB = Math.round(plan.features.max_media_storage_mb / 1024)
      if (!displayFeatures.some((f) => f.includes("storage"))) {
        displayFeatures.push(storageGB === -1 ? "Unlimited storage" : `${storageGB}GB storage`)
      }
    }
  }

  // Add basic support features
  if (plan.price === 0) {
    displayFeatures.push("Basic support")
  } else if (plan.price >= 99) {
    displayFeatures.push("Priority support", "Advanced analytics", "Custom branding")
  } else {
    displayFeatures.push("Email support", "Analytics dashboard")
  }

  return displayFeatures
}

export default function PricingCards({ plans }: PricingCardsProps) {
  console.log("[v0] Pricing plans received:", plans)

  if (!plans || plans.length === 0) {
    console.log("[v0] No plans to display")
    return (
      <div className="text-center text-muted-foreground py-12">
        <p>No pricing plans available at the moment.</p>
      </div>
    )
  }

  // Group plans by base name (Free, Pro, Ultra)
  const groupedPlans = plans.reduce(
    (acc, plan) => {
      const baseName = plan.name.replace(/ (Monthly|Yearly)$/, "")
      if (!acc[baseName]) {
        acc[baseName] = []
      }
      acc[baseName].push(plan)
      return acc
    },
    {} as Record<string, Plan[]>,
  )

  const getDisplayPrice = (planGroup: Plan[]) => {
    if (planGroup[0].price === 0) return "$0"
    // Show monthly price if available
    const monthlyPlan = planGroup.find((p) => p.billing_cycle === "monthly")
    if (monthlyPlan) return `$${monthlyPlan.price}`
    // Otherwise show yearly divided by 12
    const yearlyPlan = planGroup.find((p) => p.billing_cycle === "yearly")
    if (yearlyPlan) return `$${(yearlyPlan.price / 12).toFixed(0)}`
    return `$${planGroup[0].price}`
  }

  const getBillingText = (planGroup: Plan[]) => {
    if (planGroup[0].price === 0) return "/month"
    if (planGroup.length > 1) return "/month"
    return `/${planGroup[0].billing_cycle}`
  }

  const getRecommendedPlan = (baseName: string) => {
    return baseName === "Pro"
  }

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {Object.entries(groupedPlans).map(([baseName, planGroup]) => {
        const isRecommended = getRecommendedPlan(baseName)
        const primaryPlan = planGroup.find((p) => p.billing_cycle === "monthly") || planGroup[0]
        const features = extractFeatures(primaryPlan)

        console.log("[v0] Rendering plan:", baseName, "features:", features)

        return (
          <Card
            key={baseName}
            className={`relative p-8 ${isRecommended ? "border-primary shadow-lg scale-105" : "border-border"}`}
          >
            {isRecommended && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  Recommended
                </span>
              </div>
            )}

            <div className="space-y-6">
              {/* Plan Header */}
              <div>
                <h3 className="text-2xl font-semibold text-foreground mb-2">{baseName}</h3>
                <p className="text-muted-foreground text-sm">{primaryPlan.description}</p>
              </div>

              {/* Pricing */}
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-foreground">{getDisplayPrice(planGroup)}</span>
                <span className="text-muted-foreground">{getBillingText(planGroup)}</span>
              </div>

              {/* Features */}
              <ul className="space-y-3">
                {features.map((feature: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link href={`/auth/sign-up/${primaryPlan.id}`} className="block">
                <Button
                  className={`w-full ${
                    isRecommended
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {primaryPlan.price === 0 ? "Start Free" : `Start with ${baseName}`}
                </Button>
              </Link>

              {/* Billing Options */}
              {planGroup.length > 1 && (
                <div className="text-center text-sm text-muted-foreground">
                  <Link
                    href={`/auth/sign-up/${planGroup.find((p) => p.billing_cycle === "yearly")?.id}`}
                    className="text-primary hover:underline"
                  >
                    Save with yearly billing
                  </Link>
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
