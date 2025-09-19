import type React from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { UserProvider } from "@/lib/hooks/use-user"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // If Supabase is not configured, redirect to home
  if (!isSupabaseConfigured()) {
    redirect("/")
  }

  try {
    // Check if user is authenticated
    const supabase = await createClient()

    // Add null check for supabase client
    if (!supabase) {
      console.error("[v0] Supabase client failed to initialize")
      redirect("/auth/login")
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // Handle auth errors more gracefully
    if (error) {
      // Check if it's a session-related error that might be recoverable
      if (error.message.includes("session") || error.message.includes("token") || error.message.includes("expired")) {
        console.log("[v0] Session issue detected, attempting refresh...")

        // Try to refresh the session
        const {
          data: { session },
          error: refreshError,
        } = await supabase.auth.refreshSession()

        if (refreshError || !session?.user) {
          console.error("[v0] Session refresh failed:", refreshError?.message || "Auth session missing!")
          redirect("/auth/login")
          return // This return will never be reached due to redirect, but makes the code clearer
        }

        // Use the refreshed user
        const refreshedUser = session.user

        return (
          <UserProvider>
            <div className="flex h-screen bg-background">
              {/* Sidebar */}
              <DashboardSidebar />

              {/* Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <DashboardHeader user={refreshedUser} />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
              </div>
            </div>
          </UserProvider>
        )
      } else {
        // For non-session errors, redirect to login
        console.error("[v0] Auth error:", error.message)
        redirect("/auth/login")
      }
    }

    // If no user, redirect to login
    if (!user) {
      redirect("/auth/login")
    }

    return (
      <UserProvider>
        <div className="flex h-screen bg-background">
          {/* Sidebar */}
          <DashboardSidebar />

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <DashboardHeader user={user} />

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </UserProvider>
    )
  } catch (error) {
    console.error("[v0] Dashboard layout error:", error)
    redirect("/auth/login")
  }
}
