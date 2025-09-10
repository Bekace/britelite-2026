import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET() {
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

    const { data: plans, error } = await supabase
      .from("subscription_plans")
      .select(`
        *,
        user_subscriptions (
          id
        )
      `)
      .order("price", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plans })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!name || !price || !billing_cycle || !max_screens || !max_media_storage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: plan, error } = await supabase
      .from("subscription_plans")
      .insert({
        name,
        description,
        price: Number.parseFloat(price),
        billing_cycle,
        max_screens: Number.parseInt(max_screens),
        max_playlists: Number.parseInt(max_playlists || 0),
        max_media_assets: Number.parseInt(max_media_assets || 0),
        max_media_storage: Number.parseInt(max_media_storage),
        is_active: is_active ?? true,
      })
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
