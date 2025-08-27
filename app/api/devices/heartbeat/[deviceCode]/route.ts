import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest, { params }: { params: { deviceCode: string } }) {
  try {
    const { deviceCode } = params

    console.log("[v0] Device heartbeat:", { deviceCode })

    if (!deviceCode) {
      return NextResponse.json({ error: "Device code is required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Update device heartbeat
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .update({
        last_heartbeat: new Date().toISOString(),
      })
      .eq("device_code", deviceCode)
      .eq("is_paired", true)
      .select("id, screen_id")
      .single()

    if (deviceError || !device) {
      console.log("[v0] Device not found for heartbeat:", deviceError)
      return NextResponse.json({ error: "Device not found or not paired" }, { status: 404 })
    }

    // Update screen last seen if device is paired to a screen
    if (device.screen_id) {
      const { error: screenError } = await supabase
        .from("screens")
        .update({
          last_seen: new Date().toISOString(),
          status: "online",
        })
        .eq("id", device.screen_id)

      if (screenError) {
        console.log("[v0] Failed to update screen status:", screenError)
      }
    }

    console.log("[v0] Device heartbeat updated successfully")

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Device heartbeat error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
