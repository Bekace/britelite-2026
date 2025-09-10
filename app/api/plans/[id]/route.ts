import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Check if user is superadmin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      price,
      billing_cycle,
      max_screens,
      max_playlists,
      max_media_assets,
      max_media_storage,
      is_active,
    } = body

    const { data: plan, error } = await supabase
      .from("subscription_plans")
      .update({
        name,
        description,
        price: Number.parseFloat(price),
        billing_cycle,
        max_screens: Number.parseInt(max_screens),
        max_playlists: Number.parseInt(max_playlists || 0),
        max_media_assets: Number.parseInt(max_media_assets || 0),
        max_media_storage: Number.parseInt(max_media_storage),
        is_active,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Check if user is superadmin
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if plan has active subscriptions
    const { data: subscriptions } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("plan_id", params.id)
      .eq("status", "active")

    if (subscriptions && subscriptions.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete plan with active subscriptions",
        },
        { status: 400 },
      )
    }

    const { error } = await supabase.from("subscription_plans").delete().eq("id", params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
