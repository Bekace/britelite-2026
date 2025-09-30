import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] ===== Analytics Frame Processing Started =====")

    const { screenId, analytics, timestamp } = await request.json()

    console.log("[v0] Received data:", {
      screenId,
      analytics,
      timestamp,
    })

    if (!screenId || !analytics) {
      console.log("[v0] ERROR: Missing required fields")
      return NextResponse.json({ error: "Screen ID and analytics data are required" }, { status: 400 })
    }

    console.log("[v0] Creating Supabase client with service role key...")
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    })
    console.log("[v0] Supabase client created successfully")

    const insertData = {
      screen_id: screenId,
      event_type: "audience_analytics",
      event_data: analytics,
      created_at: timestamp || new Date().toISOString(),
    }

    console.log("[v0] Attempting to insert data:", JSON.stringify(insertData, null, 2))

    const { data: insertedData, error: insertError } = await supabase.from("analytics").insert(insertData).select()

    if (insertError) {
      console.error("[v0] ❌ Database insert error:", insertError)
      console.error("[v0] Error details:", {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      })
      return NextResponse.json({ error: "Failed to store analytics data", details: insertError }, { status: 500 })
    }

    console.log("[v0] ✅ Analytics data stored successfully!")
    console.log("[v0] Inserted data:", insertedData)
    console.log("[v0] ===== Analytics Frame Processing Complete =====")

    return NextResponse.json({
      success: true,
      analytics,
      insertedData,
      message: "Analytics processed successfully",
    })
  } catch (error) {
    console.error("[v0] ❌ Analytics processing error:", error)
    console.error("[v0] Error stack:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json(
      {
        error: "Failed to process analytics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
