import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Try to get environment variables, with fallbacks for v0 environment
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== "undefined" && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    ""

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== "undefined" && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    ""

  console.log("[v0] Client env check:", {
    supabaseUrl: !!supabaseUrl,
    supabaseAnonKey: !!supabaseAnonKey,
    processEnvUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    processEnvKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Missing Supabase environment variables")
    throw new Error("Supabase environment variables not available")
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
