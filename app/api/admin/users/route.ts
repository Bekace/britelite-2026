import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin/auth"
import { logAdminAction } from "@/lib/admin/audit"

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdmin()

    const { data: users, error } = await supabase
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
          subscription_plans(name)
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    console.log("[v0] Raw users from database:", users)
    console.log("[v0] Number of users found:", users?.length || 0)

    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      role: user.role || "user",
      created_at: user.created_at,
      full_name: user.full_name,
      company_name: user.company_name,
      subscription_status: user.user_subscriptions?.[0]?.status || "inactive",
      subscription_plan: user.user_subscriptions?.[0]?.subscription_plans?.name,
    }))

    console.log("[v0] Formatted users being returned:", formattedUsers)

    await logAdminAction({
      action: "view_users",
      targetType: "user",
      details: { count: users.length },
    })

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error("[v0] Admin users fetch error:", error)
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

    // Create user in auth.users (this would typically be done via Supabase Admin API)
    // For now, we'll create a profile entry assuming the user exists
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
    console.error("[v0] Admin user creation error:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
