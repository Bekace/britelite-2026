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

    // Check if user is super admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    const isSuperAdmin = profile?.role === "super_admin"

    // Super admins have unlimited screens — no billing involved
    if (isSuperAdmin) {
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
        billableScreens: 0,
        pricePerScreen: 0,
      })
    }

    // Get current screen count
    const { count: currentScreens, error: countError } = await supabase
      .from("screens")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)

    if (countError) {
      console.error("Error counting screens:", countError)
      return NextResponse.json({ error: "Failed to count screens" }, { status: 500 })
    }

    // Get user's active subscription including plan details and purchased_screen_slots
    const { data: subscription, error: subError } = await supabase
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

    const hasPaidSubscription = !subError && !!subscription
    // Supabase returns joined relations as an array — extract the first element
    const planRaw = subscription?.subscription_plans
    const plan = (Array.isArray(planRaw) ? planRaw[0] : planRaw) as {
      id: string
      name: string
      max_screens: number
      free_screens: number
    } | null

    const isPaidPlan = hasPaidSubscription && !!plan && plan?.name !== "Free"

    if (isPaidPlan && plan) {
      const freeScreens = plan.free_screens ?? 0
      const billableScreens = Math.max(0, (currentScreens || 0) - freeScreens)

      // Read per-screen price from subscription_prices
      const { data: monthlyPriceRecord } = await supabase
        .from("subscription_prices")
        .select("price")
        .eq("plan_id", plan.id)
        .eq("billing_cycle", "monthly")
        .eq("is_active", true)
        .single()

      const pricePerScreen = Number(monthlyPriceRecord?.price) || 0

      // Source of truth for purchased slots: count active slot subscriptions in the screens table
      // (screens with a stripe_subscription_id are paid slots; is_free_slot screens are the base free screen)
      const { count: paidSlotScreens } = await supabase
        .from("screens")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("stripe_subscription_id", "is", null)
        .is("slot_cancel_at", null) // don't count slots already scheduled for cancellation

      // purchased_screen_slots is the source of truth — incremented immediately on confirm
      // paidSlotScreens is a sanity check for legacy screens that have stripe_subscription_id
      const purchasedSlots = Math.max(
        subscription?.purchased_screen_slots ?? 0,
        paidSlotScreens ?? 0
      )

      // If a slot was purchased but the wizard was closed before the screen was created,
      // pending_slot_subscription_id keeps that slot "reserved" and available
      const hasPendingSlot = !!subscription?.pending_slot_subscription_id

      // availableSlots = free screens + purchased paid slots - screens already created
      // hasPendingSlot ensures the reserved slot shows as available even without a screen row
      const availableSlots = freeScreens + purchasedSlots - (currentScreens || 0)

      // Return pendingSlotSubscriptionId so the screens page can pre-fill the wizard
      const pendingSlotData = hasPendingSlot ? {
        pendingSlotSubscriptionId: subscription.pending_slot_subscription_id,
      } : {}

      const result = {
        current: currentScreens || 0,
        limit: -1,
        canCreate: availableSlots > 0,
        plan: plan.name,
        freeScreens,
        billableScreens,
        pricePerScreen,
        billingCycle: "monthly",
        purchasedSlots,
        availableSlots,
        ...pendingSlotData,
      }
      return NextResponse.json(result)
    }

    // Free plan or no subscription — enforce max_screens cap
    let maxScreens = 1
    let planName = "Free"
    let freeScreens = 0

    if (hasPaidSubscription && plan) {
      maxScreens = plan.max_screens
      planName = plan.name
      freeScreens = plan.free_screens ?? 0
    } else {
      const { data: freePlan } = await supabase
        .from("subscription_plans")
        .select("max_screens, name, free_screens")
        .eq("name", "Free")
        .single()

      if (freePlan) {
        maxScreens = freePlan.max_screens
        planName = freePlan.name
        freeScreens = freePlan.free_screens ?? 0
      }
    }

    const canCreate = maxScreens === -1 || (currentScreens || 0) < maxScreens

    return NextResponse.json({
      current: currentScreens || 0,
      limit: maxScreens,
      canCreate,
      plan: planName,
      freeScreens,
      billableScreens: 0,
      pricePerScreen: 0,
    })
  } catch (error) {
    console.error("Error fetching screen limits:", error)
    return NextResponse.json({ error: "Failed to fetch screen limits" }, { status: 500 })
  }
}
