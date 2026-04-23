import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/devices/heartbeat
 * 
 * Android devices send heartbeat every 30 seconds to indicate they're online.
 * Updates the last_heartbeat timestamp in the devices table.
 * 
 * Request body:
 * {
 *   "device_code": "ABC123",
 *   "device_info": {
 *     "app_version": "1.0.0",
 *     "os_version": "Android 12",
 *     "battery_level": 85,
 *     "storage_available": 1024000000
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { 
      device_code, 
      device_info,
      status = "online",
      cpu_usage,
      memory_usage,
      storage_available
    } = body

    if (!device_code) {
      return NextResponse.json(
        { error: "device_code is required" },
        { status: 400 }
      )
    }

    console.log("[v0] Heartbeat received from device:", device_code)

    // Get device info first
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id, screen_id")
      .eq("device_code", device_code)
      .single()

    if (deviceError || !device) {
      console.error("[v0] Device not found:", device_code)
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      )
    }

    // Update last_heartbeat and optionally device_info in devices table
    const updateData: any = {
      last_heartbeat: new Date().toISOString(),
      is_online: status === "online"
    }

    if (device_info) {
      updateData.device_info = device_info
    }

    const { error: updateError } = await supabase
      .from("devices")
      .update(updateData)
      .eq("device_code", device_code)

    if (updateError) {
      console.error("[v0] Error updating heartbeat:", updateError)
      return NextResponse.json(
        { error: "Failed to update heartbeat", details: updateError.message },
        { status: 500 }
      )
    }

    // Insert heartbeat record into screen_heartbeats table for analytics
    if (device.screen_id) {
      const { error: heartbeatError } = await supabase
        .from("screen_heartbeats")
        .insert({
          device_id: device.id,
          screen_id: device.screen_id,
          status,
          cpu_usage: cpu_usage || null,
          memory_usage: memory_usage || null,
          storage_available: storage_available || null,
          metadata: device_info || {}
        })

      if (heartbeatError) {
        console.error("[v0] Error inserting heartbeat record:", heartbeatError)
        // Don't fail the request, just log the error
      }
    }

    console.log("[v0] Heartbeat updated successfully for device:", device_code)

    return NextResponse.json({
      success: true,
      last_heartbeat: updateData.last_heartbeat,
      message: "Heartbeat recorded successfully"
    })

  } catch (error: any) {
    console.error("[v0] Error in heartbeat endpoint:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
