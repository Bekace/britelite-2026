import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { deviceCode, screenId } = await request.json()

    console.log("[v0] Pairing request:", { deviceCode, screenId })

    if (!deviceCode || !screenId) {
      return NextResponse.json({ error: "Device code and screen ID are required" }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.log("[v0] User profile not found, creating one:", { userId: user.id, error: profileError })

      // Create profile for user if it doesn't exist
      const { error: createProfileError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email,
        full_name: user.email,
      })

      if (createProfileError) {
        console.log("[v0] Failed to create user profile:", createProfileError)
        return NextResponse.json(
          {
            error: "User profile required but could not be created",
            details: createProfileError.message,
          },
          { status: 500 },
        )
      }

      console.log("[v0] User profile created successfully")
    }

    console.log("[v0] Looking for device:", { deviceCode, userId: user.id })

    // Find device by device code - first check if device exists at all
    const { data: allDevices, error: allDevicesError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", deviceCode)

    console.log("[v0] All devices with code:", allDevices)

    if (allDevicesError) {
      console.log("[v0] Error querying devices:", allDevicesError)
      return NextResponse.json({ error: "Database query failed" }, { status: 500 })
    }

    if (!allDevices || allDevices.length === 0) {
      console.log("[v0] No device found with code:", deviceCode)
      return NextResponse.json(
        { error: "Device not found. Make sure the device is registered and the code is correct." },
        { status: 404 },
      )
    }

    const userDevice = allDevices.find((d) => d.user_id === user.id)
    const unassignedDevice = allDevices.find((d) => d.user_id === null)

    let device
    if (userDevice) {
      // Device already belongs to current user
      device = userDevice
      console.log("[v0] Found device belonging to current user")
    } else if (unassignedDevice) {
      // Device is unassigned, claim it for current user
      device = unassignedDevice
      console.log("[v0] Found unassigned device, claiming for current user")

      // Assign device to current user
      const { error: assignError } = await supabase.from("devices").update({ user_id: user.id }).eq("id", device.id)

      if (assignError) {
        console.log("[v0] Failed to assign device to user:", {
          error: assignError,
          deviceId: device.id,
          userId: user.id,
          errorCode: assignError.code,
          errorMessage: assignError.message,
          errorDetails: assignError.details,
        })
        return NextResponse.json(
          {
            error: "Failed to assign device",
            details: assignError.message,
          },
          { status: 500 },
        )
      }
    } else {
      console.log("[v0] Device found but belongs to different user:", {
        deviceUserId: allDevices[0].user_id,
        currentUserId: user.id,
      })
      return NextResponse.json({ error: "Device belongs to another user" }, { status: 404 })
    }

    // Find screen by ID
    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select(`
        id,
        name,
        orientation,
        status,
        screen_playlists (
          playlist_id,
          is_active,
          playlists (
            id,
            name,
            background_color
          )
        )
      `)
      .eq("id", screenId)
      .eq("user_id", user.id)
      .single()

    if (screenError || !screen) {
      console.log("[v0] Screen not found:", screenError)
      return NextResponse.json({ error: "Invalid screen ID" }, { status: 404 })
    }

    // Update device to pair it with the screen
    const { error: updateError } = await supabase
      .from("devices")
      .update({
        is_paired: true,
        screen_id: screenId,
        last_heartbeat: new Date().toISOString(),
      })
      .eq("id", device.id)

    if (updateError) {
      console.log("[v0] Failed to update device:", updateError)
      return NextResponse.json({ error: "Failed to pair device" }, { status: 500 })
    }

    // Update screen status
    const { error: screenUpdateError } = await supabase
      .from("screens")
      .update({
        status: "online",
        last_seen: new Date().toISOString(),
      })
      .eq("id", screenId)

    if (screenUpdateError) {
      console.log("[v0] Failed to update screen:", screenUpdateError)
    }

    const activePlaylist = screen.screen_playlists?.find((sp: any) => sp.is_active)?.playlists || null

    console.log("[v0] Device paired successfully")

    // Return screen configuration for the device
    return NextResponse.json({
      success: true,
      screen: {
        id: screen.id,
        name: screen.name,
        orientation: screen.orientation,
        playlist: activePlaylist,
      },
    })
  } catch (error) {
    console.error("[v0] Device pairing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
