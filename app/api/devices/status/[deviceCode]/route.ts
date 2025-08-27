import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { deviceCode: string } }) {
  try {
    console.log("[v0] Device status check for:", params.deviceCode)

    const supabase = await createClient()
    if (!supabase) {
      console.log("[v0] Failed to create Supabase client")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Find device by code
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", params.deviceCode)
      .single()

    if (deviceError) {
      console.log("[v0] Device lookup error:", deviceError)
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    console.log("[v0] Device status:", {
      code: device.device_code,
      isPaired: device.is_paired,
      screenId: device.screen_id,
    })

    // Update last heartbeat
    await supabase.from("devices").update({ last_heartbeat: new Date().toISOString() }).eq("id", device.id)

    return NextResponse.json({
      device: {
        id: device.id,
        device_code: device.device_code,
        is_paired: device.is_paired,
        screen_id: device.screen_id,
        last_heartbeat: device.last_heartbeat,
      },
    })
  } catch (error) {
    console.log("[v0] Device status API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
