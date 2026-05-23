"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { User, Shield, Bell, CreditCard, Key, Settings } from "lucide-react"

const settingsNavigation = [
  {
    name: "General",
    href: "/dashboard/settings/general",
    icon: Settings,
  },
  {
    name: "Profile",
    href: "/dashboard/settings/profile",
    icon: User,
  },
  {
    name: "Security",
    href: "/dashboard/settings/security",
    icon: Shield,
  },
  {
    name: "Notifications",
    href: "/dashboard/settings/notifications",
    icon: Bell,
  },
  {
    name: "Billing",
    href: "/dashboard/settings/billing",
    icon: CreditCard,
  },
  {
    name: "API Tokens",
    href: "/dashboard/settings/tokens",
    icon: Key,
  },
]

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile: Horizontal scrollable tabs */}
      <div className="lg:hidden -mx-4 px-4 overflow-x-auto">
        <nav className="flex gap-1 pb-2 min-w-max">
          {settingsNavigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-full whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Desktop: Vertical sidebar */}
      <div className="hidden lg:block w-56 flex-shrink-0">
        <nav className="space-y-1">
          {settingsNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "block px-3 py-2 text-sm rounded-md transition-colors",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
