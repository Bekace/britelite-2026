import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

interface StorageUsageBarProps {
  currentGB: number
  maxGB: number
  usagePercentage: number
  className?: string
}

export function StorageUsageBar({ currentGB, maxGB, usagePercentage, className }: StorageUsageBarProps) {
  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500"
    if (percentage >= 75) return "bg-yellow-500"
    return "bg-cyan-500"
  }

  const getUsageBadgeVariant = (percentage: number) => {
    if (percentage >= 90) return "destructive"
    if (percentage >= 75) return "secondary"
    return "default"
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Storage Usage</span>
        <Badge variant={getUsageBadgeVariant(usagePercentage)}>
          {currentGB.toFixed(2)} GB / {maxGB} GB
        </Badge>
      </div>
      <Progress
        value={usagePercentage}
        className="h-2"
        // @ts-ignore - Custom color override
        style={{ "--progress-background": getUsageColor(usagePercentage) } as any}
      />
      {usagePercentage >= 90 && (
        <p className="text-xs text-red-600">Storage almost full. Consider upgrading your plan.</p>
      )}
    </div>
  )
}
