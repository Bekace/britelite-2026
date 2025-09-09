"use client"

import { useFeatureLimits } from "@/hooks/use-feature-limits"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"

export function UsageWidget() {
  const { limits, usage, loading } = useFeatureLimits()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!limits || !usage) {
    return null
  }

  const usageItems = [
    {
      label: "Screens",
      current: usage.currentScreens,
      max: limits.maxScreens,
      unit: "",
    },
    {
      label: "Playlists",
      current: usage.currentPlaylists,
      max: limits.maxPlaylists,
      unit: "",
    },
    {
      label: "Media Assets",
      current: usage.currentMedia,
      max: limits.maxMediaAssets,
      unit: "",
    },
    {
      label: "Storage",
      current: usage.currentStorageMB,
      max: limits.maxStorageMB,
      unit: "MB",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {usageItems.map((item) => {
          const percentage = Math.min((item.current / item.max) * 100, 100)
          const isNearLimit = percentage >= 80
          const isAtLimit = percentage >= 100

          return (
            <div key={item.label} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.label}</span>
                <span
                  className={`${isAtLimit ? "text-red-600" : isNearLimit ? "text-yellow-600" : "text-muted-foreground"}`}
                >
                  {item.current}/{item.max} {item.unit}
                </span>
              </div>
              <Progress
                value={percentage}
                className={`h-2 ${isAtLimit ? "[&>div]:bg-red-500" : isNearLimit ? "[&>div]:bg-yellow-500" : ""}`}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
