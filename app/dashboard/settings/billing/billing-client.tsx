"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import UpgradePlanDialog from "@/components/upgrade-plan-dialog"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams } from "next/navigation"

type Price = {
  id: string
  plan_id: string
  billing_cycle: "monthly" | "yearly" | "quarterly" | "lifetime"
  price: number
  stripe_price_id: string | null
  trial_days: number
  is_active: boolean
}

type Plan = {
  id: string
  name: string
  description: string
  max_screens: number
  max_playlists: number
  max_media_storage: number
  storage_unit: string
  features: {
    display_features?: string[]
    max_screens?: number
    max_playlists?: number
    max_media_storage_mb?: number
  }
  stripe_product_id: string | null
  prices: Price[]
}

interface BillingClientProps {
  plans: Plan[]
  currentPlanId?: string
}

export default function BillingClient({ plans, currentPlanId }: BillingClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()
  const searchParams = useSearchParams()

  // Show success toast if user just completed an upgrade
  useEffect(() => {
    if (searchParams.get("upgraded") === "true") {
      toast({
        title: "Success!",
        description: "Your plan has been upgraded successfully.",
      })
      // Remove the query parameter
      window.history.replaceState({}, "", "/dashboard/settings/billing")
    }
  }, [searchParams, toast])

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setIsDialogOpen(true)}>
        Upgrade Plan
      </Button>
      <UpgradePlanDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        plans={plans}
        currentPlanId={currentPlanId}
      />
    </>
  )
}
