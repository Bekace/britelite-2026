import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function requireSuperAdmin() {
  const cookieStore = cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  console.log("[v0] Supabase URL:", supabaseUrl ? "present" : "missing")
  console.log("[v0] Supabase Key:", supabaseAnonKey ? "present" : "missing")

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.trim() === "" || supabaseAnonKey.trim() === "") {
    console.log("[v0] Missing or empty Supabase environment variables")
    throw new Error("Missing Supabase environment variables")
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || profile.role !== "superadmin") {
    redirect("/dashboard")
  }

  return { user, profile, supabase }
}

export async function requireAdmin() {
  const cookieStore = cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  console.log("[v0] Admin - Supabase URL:", supabaseUrl ? "present" : "missing")
  console.log("[v0] Admin - Supabase Key:", supabaseAnonKey ? "present" : "missing")

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.trim() === "" || supabaseAnonKey.trim() === "") {
    console.log("[v0] Admin - Missing or empty Supabase environment variables")
    throw new Error("Missing Supabase environment variables")
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || (profile.role !== "admin" && profile.role !== "superadmin")) {
    redirect("/dashboard")
  }

  return { user, profile, supabase }
}
