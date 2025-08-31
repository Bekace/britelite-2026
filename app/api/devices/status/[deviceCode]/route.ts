import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { deviceCode: string } }) {
  try {
    console.log("[v0] === DEVICE STATUS CHECK START ===")
    console.log("[v0] Device status check for:", params.deviceCode, "at", new Date().toISOString())

    const supabase = await createClient()
    if (!supabase) {
      console.log("[v0] Failed to create Supabase client")
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    console.log("[v0] Looking up device with code:", params.deviceCode)

    // Find device by code (no user filtering needed for status checks)
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", params.deviceCode)
      .order("updated_at", { ascending: false }) // Add explicit ordering and fresh data query to prevent cached results
      .single()

    if (deviceError) {
      console.log("[v0] Device lookup error:", deviceError)
      console.log("[v0] Error details:", JSON.stringify(deviceError, null, 2))
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    if (!device) {
      console.log("[v0] No device found with code:", params.deviceCode)
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    console.log("[v0] === DEVICE STATUS ANALYSIS ===")
    console.log("[v0] Found device:", {
      id: device.id,
      code: device.device_code,
      isPaired: device.is_paired,
      screenId: device.screen_id,
      userId: device.user_id,
      lastHeartbeat: device.last_heartbeat,
      createdAt: device.created_at,
      updatedAt: device.updated_at,
    })

    console.log("[v0] Device pairing status:", {
      isPaired: device.is_paired,
      hasScreenId: !!device.screen_id,
      hasUserId: !!device.user_id,
      pairingComplete: device.is_paired && device.screen_id,
    })

    // Update last heartbeat
    const { error: updateError } = await supabase
      .from("devices")
      .update({ last_heartbeat: new Date().toISOString() })
      .eq("id", device.id)

    if (updateError) {
      console.log("[v0] Heartbeat update error:", updateError)
    } else {
      console.log("[v0] Heartbeat updated successfully for device:", device.device_code)
    }

    const responseData = {
      device: {
        id: device.id,
        device_code: device.device_code,
        is_paired: device.is_paired,
        screen_id: device.screen_id,
        last_heartbeat: device.last_heartbeat,
      },
    }

    console.log("[v0] === DEVICE STATUS CHECK COMPLETE ===")
    console.log("[v0] Returning device status:", responseData, "at", new Date().toISOString())

    return NextResponse.json(responseData, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.log("[v0] Device status API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
