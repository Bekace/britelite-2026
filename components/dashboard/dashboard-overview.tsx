"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Monitor, ImageIcon, PlayCircle, Activity, Plus, TrendingUp, Zap, Crown } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { UsageWidget } from "./usage-widget"
import { useFeatureLimits } from "@/hooks/use-feature-limits"
import { useEffect, useState } from "react"
import Link from "next/link"

interface DashboardOverviewProps {
  user: User
}

interface DashboardStats {
  activeScreens: number
  storageUsedMB: number
  activePlaylists: number
  totalViews: number
  currentPlan: {
    name: string
    price: number
    billing_cycle: string
  } | null
}

export function DashboardOverview({ user }: DashboardOverviewProps) {
  const { canCreateScreen, canCreatePlaylist, canUploadMedia } = useFeatureLimits()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/dashboard/stats")
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    {
      title: "Active Screens",
      value: loading ? "..." : stats?.activeScreens.toString() || "0",
      change: "+2 from last month",
      icon: Monitor,
      color: "text-primary",
    },
    {
      title: "Storage Used",
      value: loading ? "..." : `${stats?.storageUsedMB || 0} MB`,
      change: "+18 MB this week",
      icon: ImageIcon,
      color: "text-secondary",
    },
    {
      title: "Active Playlists",
      value: loading ? "..." : stats?.activePlaylists.toString() || "0",
      change: "+1 this week",
      icon: PlayCircle,
      color: "text-accent",
    },
    {
      title: "Total Views",
      value: loading ? "..." : stats?.totalViews.toLocaleString() || "0",
      change: "+12% from last week",
      icon: Activity,
      color: "text-chart-4",
    },
  ]

  const quickActions = [
    {
      title: "Add New Screen",
      description: canCreateScreen ? "Connect a new display to your network" : "Screen limit reached for your plan",
      icon: Monitor,
      href: "/dashboard/screens/new",
      disabled: !canCreateScreen,
    },
    {
      title: "Upload Media",
      description: canUploadMedia ? "Add images and videos to your library" : "Storage limit reached for your plan",
      icon: ImageIcon,
      href: "/dashboard/media/upload",
      disabled: !canUploadMedia,
    },
    {
      title: "Create Playlist",
      description: canCreatePlaylist ? "Build a new content playlist" : "Playlist limit reached for your plan",
      icon: PlayCircle,
      href: "/dashboard/playlists/new",
      disabled: !canCreatePlaylist,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Welcome back, {user.email?.split("@")[0]}!</h2>
          <p className="text-muted-foreground mt-1">Here's what's happening with your digital signage network today.</p>
          {stats?.currentPlan && (
            <div className="flex items-center gap-2 mt-2">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Current Plan: {stats.currentPlan.name}
                {stats.currentPlan.price > 0 && (
                  <span className="text-muted-foreground ml-1">
                    (${stats.currentPlan.price}/{stats.currentPlan.billing_cycle})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/dashboard/billing">
            <Crown className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <div
                  key={action.title}
                  className={`flex items-center justify-between p-4 border border-border rounded-lg transition-colors ${
                    action.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        action.disabled ? "bg-muted" : "bg-primary/10"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${action.disabled ? "text-muted-foreground" : "text-primary"}`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{action.title}</h4>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                  {action.disabled ? (
                    <Button variant="ghost" size="sm" disabled>
                      <Plus className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button asChild variant="ghost" size="sm">
                      <Link href={action.href}>
                        <Plus className="w-4 h-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        <UsageWidget />
      </div>
    </div>
  )
}
