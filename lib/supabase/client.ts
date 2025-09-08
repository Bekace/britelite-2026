import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  console.log("[v0] Supabase URL available:", !!supabaseUrl)
  console.log("[v0] Supabase Anon Key available:", !!supabaseAnonKey)

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Missing environment variables:", {
      url: !!supabaseUrl,
      key: !!supabaseAnonKey,
    })
    throw new Error(`Missing Supabase environment variables. URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}`)
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
