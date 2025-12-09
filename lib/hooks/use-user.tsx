"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface UserProfile {
  id: string
  email: string
  role: "user" | "admin" | "superadmin"
}

interface UserContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  loading: true,
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    const getUser = async () => {
      try {
        console.log("[v0] useUser - starting getUser")
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        console.log("[v0] useUser - getUser result:", user?.id, user?.email, "error:", userError)

        setUser(user)

        if (user) {
          console.log("[v0] useUser - fetching profile for user:", user.id)
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("id, email, role")
            .eq("id", user.id)
            .single()

          console.log("[v0] useUser - profile fetch result:", JSON.stringify({ profile, error }))

          setProfile(profile)
        }
      } catch (err) {
        console.error("[v0] useUser - getUser error:", err)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] useUser - auth state change:", event, session?.user?.email)

      setUser(session?.user ?? null)

      if (session?.user) {
        try {
          console.log("[v0] useUser - onAuthStateChange fetching profile for:", session.user.id)
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("id, email, role")
            .eq("id", session.user.id)
            .single()

          console.log("[v0] useUser - onAuthStateChange profile result:", JSON.stringify({ profile, error }))

          setProfile(profile)
        } catch (err) {
          console.error("[v0] useUser - onAuthStateChange profile error:", err)
        }
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return <UserContext.Provider value={{ user, profile, loading }}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
