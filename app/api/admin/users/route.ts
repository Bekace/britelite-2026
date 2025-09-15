import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin()

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: users, error } = await adminSupabase
      .from("profiles")
      .select(`
        id,
        email,
        role,
        created_at,
        full_name,
        company_name,
        user_subscriptions(
          status,
          plan_id,
          created_at,
          subscription_plans(name, id)
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    console.log("[v0] Raw users data from database:", JSON.stringify(users, null, 2))

    const formattedUsers = users.map((user: any) => {
      let subscriptionStatus = "inactive"
      let subscriptionPlan = null
      let subscriptionPlanId = null

      console.log(`[v0] Processing user ${user.email}:`, {
        id: user.id,
        user_subscriptions: user.user_subscriptions,
      })

      // Since each user has only one subscription, take the first (and only) one
      if (user.user_subscriptions && user.user_subscriptions.length > 0) {
        const subscription = user.user_subscriptions[0]
        subscriptionStatus = subscription.status || "inactive"
        subscriptionPlan = subscription.subscription_plans?.name || null
        subscriptionPlanId = subscription.plan_id || null

        console.log(`[v0] Found subscription for ${user.email}:`, subscription)
      } else {
        console.log(`[v0] No subscription found for ${user.email}`)
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role || "user",
        created_at: user.created_at,
        full_name: user.full_name,
        company_name: user.company_name,
        subscription_status: subscriptionStatus,
        subscription_plan: subscriptionPlan,
        subscription_plan_id: subscriptionPlanId,
      }
    })

    console.log(
      "[v0] Fetched users with subscription data:",
      formattedUsers.map((u) => ({
        email: u.email,
        subscription_status: u.subscription_status,
        subscription_plan: u.subscription_plan,
      })),
    )

    await logAdminAction({
      action: "view_users",
      targetType: "user",
      details: { count: formattedUsers.length },
    })

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error("Admin users fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin()
    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 })
    }

    const { data: newUser, error } = await supabase
      .from("profiles")
      .insert({
        email,
        role,
      })
      .select()
      .single()

    if (error) throw error

    await logAdminAction({
      action: "create_user",
      targetType: "user",
      targetId: newUser.id,
      details: { email, role },
    })

    return NextResponse.json({ user: newUser })
  } catch (error) {
    console.error("Admin user creation error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
