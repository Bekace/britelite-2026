import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

/**
 * POST /api/screens/[id]/cancel-slot/test-finalize
 *
 * DEV/TEST ONLY — forces immediate finalization of a pending slot cancellation
 * without waiting for the billing period to end.
 *
 * Only works in non-production environments.
 *
 * Steps:
 * 1. Sets slot_cancel_at = now (past) on the screen
 * 2. Runs the same finalization logic the webhook would run at period end:
 *    - Deletes the screen
 *    - Decrements purchased_screen_slots
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }

  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const serviceSupabase = await createServiceRoleClient()

    // Confirm the screen belongs to this user and has a pending cancellation
    const { data: screen, error: screenError } = await serviceSupabase
      .from("screens")
      .select("id, name, slot_cancel_at, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    if (!screen.slot_cancel_at) {
      return NextResponse.json(
        { error: "This screen has no pending cancellation. Cancel it first via the dropdown." },
        { status: 400 }
      )
    }

    // Get the user's subscription to decrement the counter
    const { data: userSub, error: subError } = await serviceSupabase
      .from("user_subscriptions")
      .select("id, purchased_screen_slots")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (subError || !userSub) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 400 })
    }

    // Delete the screen
    const { error: deleteError } = await serviceSupabase
      .from("screens")
      .delete()
      .eq("id", id)

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete screen" }, { status: 500 })
    }

    // Decrement the slot counter
    const newSlots = Math.max(0, (userSub.purchased_screen_slots ?? 0) - 1)
    await serviceSupabase
      .from("user_subscriptions")
      .update({ purchased_screen_slots: newSlots })
      .eq("id", userSub.id)

    return NextResponse.json({
      success: true,
      message: `Screen "${screen.name}" has been finalized and removed. Slots decremented from ${userSub.purchased_screen_slots} to ${newSlots}.`,
      screen_deleted: screen.name,
      slots_before: userSub.purchased_screen_slots,
      slots_after: newSlots,
    })
  } catch (err: any) {
    console.error("[test-finalize] error:", err)
    return NextResponse.json({ error: err.message || "Failed to finalize" }, { status: 500 })
  }
}
