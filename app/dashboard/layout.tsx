import type React from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

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

    // Handle auth errors
    if (error) {
      console.error("[v0] Auth error:", error.message)
      redirect("/auth/login")
    }

    // If no user, redirect to login
    if (!user) {
      redirect("/auth/login")
    }

    return (
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
    )
  } catch (error) {
    console.error("[v0] Dashboard layout error:", error)
    redirect("/auth/login")
  }
}
