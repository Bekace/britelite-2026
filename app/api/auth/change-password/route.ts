import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required." }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
    }

    // Get authenticated user from server-side session
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user?.email) {
      return NextResponse.json({ error: "Not authenticated. Please log in again." }, { status: 401 })
    }

    // Verify current password by attempting sign-in server-side
    // This is safe because it runs on the server and doesn't affect the browser session
    const verifyClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )

    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 })
    }

    // Update password using the authenticated server client
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[change-password] unexpected error:", err)
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 })
  }
}
