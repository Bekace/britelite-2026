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
  features: string[]
}

interface PricingCardsProps {
  plans: Plan[]
}

export default function PricingCards({ plans }: PricingCardsProps) {
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
    if (yearlyPlan) return `$${(yearlyPlan.price).toFixed(0)}`
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
                {primaryPlan.features.map((feature: string, idx: number) => (
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
