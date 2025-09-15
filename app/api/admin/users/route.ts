import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"
import { createClient } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin()

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: usersWithSubs, error } = await adminSupabase
      .from("profiles")
      .select(`
        id,
        email,
        role,
        created_at,
        full_name,
        company_name,
        user_subscriptions!inner(
          status,
          plan_id,
          created_at,
          subscription_plans(name, id)
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    const formattedUsersWithSubs = usersWithSubs.map((user: any) => {
      let subscriptionStatus = "inactive"
      let subscriptionPlan = null
      let subscriptionPlanId = null

      if (user.user_subscriptions && user.user_subscriptions.length > 0) {
        // Sort subscriptions to prioritize active ones, then by creation date
        const sortedSubscriptions = user.user_subscriptions.sort((a: any, b: any) => {
          if (a.status === "active" && b.status !== "active") return -1
          if (b.status === "active" && a.status !== "active") return 1
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        const primarySubscription = sortedSubscriptions[0]
        subscriptionStatus = primarySubscription.status
        subscriptionPlan = primarySubscription.subscription_plans?.name
        subscriptionPlanId = primarySubscription.plan_id
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

    const { data: usersWithoutSubs, error: noSubsError } = await adminSupabase
      .from("profiles")
      .select(`
        id,
        email,
        role,
        created_at,
        full_name,
        company_name
      `)
      .not("id", "in", `(${usersWithSubs.map((u) => `'${u.id}'`).join(",") || "''"})`)
      .order("created_at", { ascending: false })

    if (!noSubsError && usersWithoutSubs) {
      const usersWithoutSubsFormatted = usersWithoutSubs.map((user: any) => ({
        id: user.id,
        email: user.email,
        role: user.role || "user",
        created_at: user.created_at,
        full_name: user.full_name,
        company_name: user.company_name,
        subscription_status: "inactive",
        subscription_plan: null,
        subscription_plan_id: null,
      }))

      formattedUsersWithSubs.push(...usersWithoutSubsFormatted)
    }

    // Sort all users by creation date
    const formattedUsers = formattedUsersWithSubs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )

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
