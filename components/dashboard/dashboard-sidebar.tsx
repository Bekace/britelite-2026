"use client"

import { useState, useEffect, createContext, useContext } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useUser } from "@/lib/hooks/use-user"
import { usePlanLimits } from "@/hooks/use-plan-limits"
import { Drawer } from "vaul"
import {
  LayoutDashboard,
  Monitor,
  ImageIcon,
  PlayCircle,
  Calendar,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users as UsersIcon,
  CreditCard,
  Zap,
  MapPin,
  UserPlus,
  LayoutList,
  UtensilsCrossed,
  ChefHat,
  Menu,
  X,
} from "lucide-react"

// Context for mobile drawer state
interface SidebarContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isMobile: boolean
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  setIsOpen: () => {},
  isMobile: false,
})

export const useSidebar = () => useContext(SidebarContext)

// Provider component
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, isMobile }}>
      {children}
    </SidebarContext.Provider>
  )
}

// Hamburger button for header
export function MobileMenuButton() {
  const { setIsOpen, isMobile } = useSidebar()

  if (!isMobile) return null

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsOpen(true)}
      className="md:hidden text-foreground"
    >
      <Menu className="w-5 h-5" />
      <span className="sr-only">Open menu</span>
    </Button>
  )
}

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Screens", href: "/dashboard/screens", icon: Monitor },
  { name: "Locations", href: "/dashboard/locations", icon: MapPin },
  { name: "Media Library", href: "/dashboard/media", icon: ImageIcon },
  { name: "Playlists", href: "/dashboard/playlists", icon: PlayCircle },
  { name: "Schedules", href: "/dashboard/schedules", icon: Calendar },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Restaurant Menus", href: "/dashboard/restaurant-menus", icon: UtensilsCrossed },
  { name: "Team", href: "/dashboard/team", icon: UserPlus },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

const adminNavigation = [
  { name: "Admin Overview", href: "/dashboard/admin-overview", icon: Shield },
  { name: "User Management", href: "/dashboard/user-management", icon: UsersIcon },
  { name: "Plan Management", href: "/dashboard/plan-management", icon: CreditCard },
  { name: "Feature Management", href: "/dashboard/feature-management", icon: Zap },
  { name: "Pricing Bullets", href: "/dashboard/pricing-bullets", icon: LayoutList },
  { name: "Menu Templates", href: "/dashboard/admin/restaurant-menus", icon: ChefHat },
]

// Navigation content (shared between desktop and mobile)
function NavigationContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { profile } = useUser()
  const { limits, features, loading: limitsLoading } = usePlanLimits()

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin"
  const isSuperAdmin = limits?.isSuperAdmin || false

  const filteredNavigation = navigation.filter((item) => {
    if (item.href === "/dashboard" || item.href === "/dashboard/settings") return true
    if (limitsLoading || !features) return false
    if (isSuperAdmin) return true
    if (item.href === "/dashboard/screens") return features.screens
    if (item.href === "/dashboard/locations") return features.locations
    if (item.href === "/dashboard/media") return features.mediaLibrary
    if (item.href === "/dashboard/playlists") return features.playlists
    if (item.href === "/dashboard/schedules") return features.schedules
    if (item.href === "/dashboard/analytics") return features.analytics
    if (item.href === "/dashboard/team") return features.teamMembers
    if (item.href === "/dashboard/restaurant-menus") return (features as any).restaurantMenus ?? false
    return true
  })

  return (
    <nav className="flex-1 p-4 space-y-1">
      {filteredNavigation.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link key={item.name} href={item.href} onClick={onNavigate}>
            <Button
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/10"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </Button>
          </Link>
        )
      })}

      {isAdmin && (
        <>
          <div className="pt-4 pb-2">
            <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-3">
              Administration
            </h3>
          </div>
          {adminNavigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.name} href={item.href} onClick={onNavigate}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/10"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Button>
              </Link>
            )
          })}
        </>
      )}
    </nav>
  )
}

// Mobile drawer sidebar
function MobileSidebar() {
  const { isOpen, setIsOpen } = useSidebar()

  return (
    <Drawer.Root direction="left" open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Drawer.Content className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-sidebar flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <img src="/xkreen-logo-light.svg" alt="XKREEN" className="h-6 w-auto block dark:hidden" />
              <img src="/xkreen-logo.svg" alt="XKREEN" className="h-6 w-auto hidden dark:block" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-sidebar-foreground hover:bg-sidebar-accent/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <NavigationContent onNavigate={() => setIsOpen(false)} />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

// Desktop sidebar
function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(true) // Default to collapsed
  const pathname = usePathname()
  const { profile } = useUser()
  const { limits, features, loading: limitsLoading } = usePlanLimits()

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin"
  const isSuperAdmin = limits?.isSuperAdmin || false

  const filteredNavigation = navigation.filter((item) => {
    if (item.href === "/dashboard" || item.href === "/dashboard/settings") return true
    if (limitsLoading || !features) return false
    if (isSuperAdmin) return true
    if (item.href === "/dashboard/screens") return features.screens
    if (item.href === "/dashboard/locations") return features.locations
    if (item.href === "/dashboard/media") return features.mediaLibrary
    if (item.href === "/dashboard/playlists") return features.playlists
    if (item.href === "/dashboard/schedules") return features.schedules
    if (item.href === "/dashboard/analytics") return features.analytics
    if (item.href === "/dashboard/team") return features.teamMembers
    if (item.href === "/dashboard/restaurant-menus") return (features as any).restaurantMenus ?? false
    return true
  })

  return (
    <div
      className={cn(
        "hidden md:flex bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo and Collapse Button */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/xkreen-logo-light.svg" alt="XKREEN" className="h-6 w-auto block dark:hidden" />
            <img src="/xkreen-logo.svg" alt="XKREEN" className="h-6 w-auto hidden dark:block" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:bg-sidebar-accent/10"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/10",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Button>
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2">
              {!collapsed && (
                <h3 className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider px-3">
                  Administration
                </h3>
              )}
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-11",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/10",
                      collapsed && "justify-center px-0"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Button>
                </Link>
              )
            })}
          </>
        )}
      </nav>
    </div>
  )
}

// Combined sidebar component
export function DashboardSidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  )
}
