"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  company_name: string | null
  role: string | null
  created_at: string
  updated_at: string
}

interface UserContextType {
  user: (User & Profile) | null
  loading: boolean
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & Profile) | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser) {
          const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()

          if (profile) {
            setUser({ ...authUser, ...profile })
          }
        }
      } catch (error) {
        console.error("[v0] Error getting user:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    let subscription: any
    try {
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
          if (session?.user) {
            const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

            if (profile) {
              setUser({ ...session.user, ...profile })
            }
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error("[v0] Error in auth state change:", error)
          setUser(null)
        } finally {
          setLoading(false)
        }
      })
      subscription = authSubscription
    } catch (error) {
      console.error("[v0] Error setting up auth listener:", error)
      setLoading(false)
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [supabase])

  return <UserContext.Provider value={{ user, loading }}>{children}</UserContext.Provider>
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
