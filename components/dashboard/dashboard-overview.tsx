"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Monitor, ImageIcon, PlayCircle, Activity, Plus, TrendingUp, Zap } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import { UsageWidget } from "./usage-widget"
import { useFeatureLimits } from "@/hooks/use-feature-limits"

interface DashboardOverviewProps {
  user: User
}

export function DashboardOverview({ user }: DashboardOverviewProps) {
  const { canCreateScreen, canCreatePlaylist, canUploadMedia } = useFeatureLimits()

  const stats = [
    {
      title: "Active Screens",
      value: "12",
      change: "+2 from last month",
      icon: Monitor,
      color: "text-primary",
    },
    {
      title: "Storage Used",
      value: "248 MB",
      change: "+18 MB this week",
      icon: ImageIcon,
      color: "text-secondary",
    },
    {
      title: "Active Playlists",
      value: "8",
      change: "+1 this week",
      icon: PlayCircle,
      color: "text-accent",
    },
    {
      title: "Total Views",
      value: "1,429",
      change: "+12% from last week",
      icon: Activity,
      color: "text-chart-4",
    },
  ]

  const quickActions = [
    {
      title: "Add New Screen",
      description: "Connect a new display to your network",
      icon: Monitor,
      href: "/dashboard/screens/new",
      disabled: !canCreateScreen,
      disabledReason: "Screen limit reached for your plan",
    },
    {
      title: "Upload Media",
      description: "Add images and videos to your library",
      icon: ImageIcon,
      href: "/dashboard/media/upload",
      disabled: false, // Will check file size and storage on upload
      disabledReason: "",
    },
    {
      title: "Create Playlist",
      description: "Build a new content playlist",
      icon: PlayCircle,
      href: "/dashboard/playlists/new",
      disabled: !canCreatePlaylist,
      disabledReason: "Playlist limit reached for your plan",
    },
  ]

  const recentActivity = [
    {
      action: "Screen 'Lobby Display' went online",
      time: "2 minutes ago",
      icon: Monitor,
    },
    {
      action: "New media file 'summer-promo.mp4' uploaded",
      time: "15 minutes ago",
      icon: ImageIcon,
    },
    {
      action: "Playlist 'Morning Announcements' updated",
      time: "1 hour ago",
      icon: PlayCircle,
    },
    {
      action: "Screen 'Cafeteria Display' went offline",
      time: "2 hours ago",
      icon: Monitor,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Welcome back, {user.email?.split("@")[0]}!</h2>
          <p className="text-muted-foreground mt-1">Here's what's happening with your digital signage network today.</p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Quick Setup
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
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
                      <p className="text-sm text-muted-foreground">
                        {action.disabled ? action.disabledReason : action.description}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" disabled={action.disabled}>
                    <Plus className="w-4 h-4" />
                  </Button>
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
