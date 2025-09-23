import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const screenId = searchParams.get("screenId")

  if (!screenId) {
    return NextResponse.json({ error: "Screen ID is required" }, { status: 400 })
  }

  try {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    })

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch analytics settings for the screen
    const { data: settings, error } = await supabase
      .from("analytics_settings")
      .select("*")
      .eq("screen_id", screenId)
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Error fetching analytics settings:", error)
      return NextResponse.json({ error: "Failed to fetch analytics settings" }, { status: 500 })
    }

    // Return settings or defaults
    return NextResponse.json({
      enabled: settings?.enabled || false,
      retention_days: settings?.retention_days || 30,
      consent_required: settings?.consent_required || true,
      sampling_rate: settings?.sampling_rate || 5,
      privacy_mode: settings?.privacy_mode || true,
    })
  } catch (error) {
    console.error("Analytics settings fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { screenId, enabled, retention_days, consent_required, sampling_rate, privacy_mode } = body

    if (!screenId) {
      return NextResponse.json({ error: "Screen ID is required" }, { status: 400 })
    }

    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
      },
    })

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user owns the screen
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("id")
      .eq("id", screenId)
      .eq("user_id", user.id)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found or access denied" }, { status: 404 })
    }

    // Upsert analytics settings
    const { data: settings, error } = await supabase
      .from("analytics_settings")
      .upsert(
        {
          screen_id: screenId,
          user_id: user.id,
          enabled: enabled !== undefined ? enabled : false,
          retention_days: retention_days || 30,
          consent_required: consent_required !== undefined ? consent_required : true,
          sampling_rate: sampling_rate || 5,
          privacy_mode: privacy_mode !== undefined ? privacy_mode : true,
        },
        {
          onConflict: "screen_id",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("Error updating analytics settings:", error)
      return NextResponse.json({ error: "Failed to update analytics settings" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings: {
        enabled: settings.enabled,
        retention_days: settings.retention_days,
        consent_required: settings.consent_required,
        sampling_rate: settings.sampling_rate,
        privacy_mode: settings.privacy_mode,
      },
    })
  } catch (error) {
    console.error("Analytics settings update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
