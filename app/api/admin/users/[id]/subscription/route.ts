import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { planId, status } = await request.json()

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", params.id)
      .single()

    if (existingSubscription) {
      // Update existing subscription
      const { error } = await supabase
        .from("user_subscriptions")
        .update({
          plan_id: planId,
          status: status || "active",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", params.id)

      if (error) throw error
    } else {
      // Create new subscription
      const { error } = await supabase.from("user_subscriptions").insert({
        user_id: params.id,
        plan_id: planId,
        status: status || "active",
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      })

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating user subscription:", error)
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
  }
}
