import type { ReactNode } from "react"
import { AdminSidebar } from "./admin-sidebar"
import { AdminHeader } from "./admin-header"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface AdminLayoutProps {
  children: ReactNode
  user: SupabaseUser
  userRole: string
}

export function AdminLayout({ children, user, userRole }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar userRole={userRole} />
      <div className="lg:pl-64">
        <AdminHeader user={user} userRole={userRole} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
