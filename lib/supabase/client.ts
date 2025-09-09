import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://placeholder-url.supabase.co"
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "placeholder-anon-key"

  console.log("[v0] Supabase URL available:", !!process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log("[v0] Supabase Anon Key available:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  console.log("[v0] Using URL:", supabaseUrl)

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
    console.error("[v0] No Supabase URL found in environment variables")
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.SUPABASE_ANON_KEY) {
    console.error("[v0] No Supabase Anon Key found in environment variables")
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
