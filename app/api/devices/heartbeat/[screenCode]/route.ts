import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: { screenCode: string } }) {
  try {
    const { screenCode } = params
    const body = await request.json()
    const { timestamp, configVersion } = body

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const { data: screen, error: fetchError } = await supabase
      .from("screens")
      .select("id, updated_at")
      .eq("screen_code", screenCode)
      .single()

    if (fetchError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    // Update last_seen timestamp and ensure status is online
    const { error: updateError } = await supabase
      .from("screens")
      .update({
        last_seen: timestamp || new Date().toISOString(),
        status: "online",
      })
      .eq("screen_code", screenCode)

    if (updateError) {
      return NextResponse.json({ error: "Failed to update heartbeat" }, { status: 500 })
    }

    const screenUpdatedAt = new Date(screen.updated_at).getTime()
    const clientConfigTime = configVersion ? Number.parseInt(configVersion) : 0
    const configUpdateRequired = screenUpdatedAt > clientConfigTime

    return NextResponse.json({
      success: true,
      configUpdateRequired,
      serverTime: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Device heartbeat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
