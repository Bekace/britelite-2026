import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Use the actual environment variables that are confirmed to be set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
