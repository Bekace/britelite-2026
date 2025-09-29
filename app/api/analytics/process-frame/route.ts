import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Analytics frame processing request received")

    const { screenId, analytics, timestamp } = await request.json()

    if (!screenId || !analytics) {
      return NextResponse.json({ error: "Screen ID and analytics data are required" }, { status: 400 })
    }

    console.log("[v0] Storing analytics for screen:", screenId)
    console.log("[v0] Analytics data:", analytics)

    // Create Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    })

    // Store analytics data in database
    const { error: insertError } = await supabase.from("analytics").insert({
      screen_id: screenId,
      event_type: "audience_analytics",
      event_data: analytics,
      created_at: timestamp || new Date().toISOString(),
    })

    if (insertError) {
      console.error("[v0] Error storing analytics:", insertError)
      return NextResponse.json({ error: "Failed to store analytics data" }, { status: 500 })
    }

    console.log("[v0] Analytics data stored successfully")

    return NextResponse.json({
      success: true,
      analytics,
      message: "Analytics processed successfully",
    })
  } catch (error) {
    console.error("[v0] Analytics processing error:", error)
    return NextResponse.json({ error: "Failed to process analytics" }, { status: 500 })
  }
}
