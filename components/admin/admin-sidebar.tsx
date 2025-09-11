"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, Users, CreditCard, Settings, Shield, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

interface AdminSidebarProps {
  userRole: string
}

export function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const navigation = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      current: pathname === "/admin",
    },
    {
      name: "User Management",
      href: "/admin/users",
      icon: Users,
      current: pathname.startsWith("/admin/users"),
    },
    {
      name: "Plan Management",
      href: "/admin/plans",
      icon: CreditCard,
      current: pathname.startsWith("/admin/plans"),
    },
    {
      name: "Feature Management",
      href: "/admin/features",
      icon: Settings,
      current: pathname.startsWith("/admin/features"),
    },
  ]

  // Only show superadmin features if user is superadmin
  const filteredNavigation =
    userRole === "superadmin" ? navigation : navigation.filter((item) => !item.href.includes("/features"))

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-semibold text-foreground">Admin Panel</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="text-muted-foreground hover:text-foreground"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {filteredNavigation.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={item.current ? "secondary" : "ghost"}
                  className={cn("w-full justify-start gap-3", collapsed && "justify-center px-2")}
                >
                  <Icon className="w-5 h-5" />
                  {!collapsed && <span>{item.name}</span>}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Back to Dashboard */}
        <div className="p-4 border-t border-border">
          <Link href="/dashboard">
            <Button variant="outline" className={cn("w-full justify-start gap-3", collapsed && "justify-center px-2")}>
              <LayoutDashboard className="w-5 h-5" />
              {!collapsed && <span>Back to Dashboard</span>}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
