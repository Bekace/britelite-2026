import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Super admins have unlimited screens
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role === "super_admin") {
      const { count: currentScreens } = await supabase
        .from("screens")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)

      return NextResponse.json({
        current: currentScreens || 0,
        limit: -1,
        canCreate: true,
        plan: "Super Admin",
        freeScreens: -1,
        purchasedSlots: 0,
        availableSlots: -1,
        billableScreens: 0,
        pricePerScreen: 0,
      })
    }

    // Current screen count
    const { count: currentScreens, error: countError } = await supabase
      .from("screens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (countError) {
      return NextResponse.json({ error: "Failed to count screens" }, { status: 500 })
    }

    // Get active subscription with plan details
    const { data: subscription } = await supabase
      .from("user_subscriptions")
      .select(`
        id,
        status,
        price_id,
        purchased_screen_slots,
        pending_slot_subscription_id,
        subscription_plans (
          id,
          name,
          max_screens,
          free_screens
        )
      `)
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .single()

    // Extract plan (Supabase may return relation as array or object)
    const planRaw = subscription?.subscription_plans
    const plan = (Array.isArray(planRaw) ? planRaw[0] : planRaw) as {
      id: string
      name: string
      max_screens: number
      free_screens: number
    } | null

    // If no active subscription at all, fall back to Free plan defaults from DB
    let freeScreens = 1
    let planName = "Free"
    let planId: string | null = null

    if (plan) {
      freeScreens = plan.free_screens ?? 1
      planName = plan.name
      planId = plan.id
    } else {
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("id, name, free_screens")
        .eq("name", "Free")
        .single()
      if (freePlan) {
        freeScreens = freePlan.free_screens ?? 1
        planName = freePlan.name
        planId = freePlan.id
      }
    }

    // purchased_screen_slots is incremented immediately on successful Stripe checkout confirmation.
    // This is the single source of truth for how many paid slots the user has.
    const purchasedSlots = subscription?.purchased_screen_slots ?? 0

    // Total slots = free included slots + paid purchased slots
    // Available = total - screens already created
    const totalSlots = freeScreens + purchasedSlots
    const availableSlots = Math.max(0, totalSlots - (currentScreens || 0))
    const canCreate = availableSlots > 0

    // Per-screen price for buy-slot dialog
    let pricePerScreen = 0
    if (planId) {
      const { data: priceRecord } = await supabase
        .from("subscription_prices")
        .select("price")
        .eq("plan_id", planId)
        .eq("billing_cycle", "monthly")
        .eq("is_active", true)
        .single()
      pricePerScreen = Number(priceRecord?.price) || 0
    }

    const billableScreens = Math.max(0, (currentScreens || 0) - freeScreens)

    const pendingSlotData = subscription?.pending_slot_subscription_id
      ? { pendingSlotSubscriptionId: subscription.pending_slot_subscription_id }
      : {}

    return NextResponse.json({
      current: currentScreens || 0,
      limit: -1,
      canCreate,
      plan: planName,
      freeScreens,
      purchasedSlots,
      availableSlots,
      billableScreens,
      pricePerScreen,
      billingCycle: "monthly",
      ...pendingSlotData,
    })
  } catch (error) {
    console.error("Error fetching screen limits:", error)
    return NextResponse.json({ error: "Failed to fetch screen limits" }, { status: 500 })
  }
}
