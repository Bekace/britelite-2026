"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { MenuBoardRenderer } from "@/components/restaurant-menus/menu-board-renderer"
import type { RestaurantMenu, LayoutConfig } from "@/lib/restaurant-menus/types"
import { defaultLayoutConfig } from "@/lib/restaurant-menus/types"
import { ChevronLeft, Monitor, Smartphone, Maximize2 } from "lucide-react"

interface MenuPreviewPageProps {
  menuId: string
}

export function MenuPreviewPage({ menuId }: MenuPreviewPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [menu, setMenu] = useState<RestaurantMenu | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"landscape" | "portrait">("landscape")

  useEffect(() => {
    fetch(`/api/restaurant-menus/${menuId}`)
      .then((r) => r.json())
      .then((d) => {
        setMenu(d.menu)
        const orientation = d.menu?.menu_template?.layout_config?.orientation || "landscape"
        setViewMode(orientation)
      })
      .catch(() => toast({ title: "Error", description: "Failed to load menu", variant: "destructive" }))
      .finally(() => setLoading(false))
  }, [menuId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!menu) return null

  const config: LayoutConfig = (menu.menu_template?.layout_config as LayoutConfig) || defaultLayoutConfig
  const orientation = config.orientation || viewMode

  // Scale to fit within a preview container (max ~900px wide for landscape)
  const containerWidth = orientation === "landscape" ? 900 : 480
  const containerHeight = orientation === "landscape" ? 506 : 853
  const scale = orientation === "landscape" ? 900 / 1920 : 480 / 1080

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/restaurant-menus/${menuId}`)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{menu.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live animated preview — {orientation === "landscape" ? "1920 × 1080" : "1080 × 1920"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!menu.menu_template && (
            <Badge variant="outline" className="text-xs">No template — using default style</Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/restaurant-menus/${menuId}`)}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Editor
          </Button>
        </div>
      </div>

      {/* Preview canvas */}
      <div className="flex items-center justify-center">
        <div
          className="rounded-xl overflow-hidden shadow-2xl border border-border"
          style={{ width: containerWidth, height: containerHeight }}
        >
          <MenuBoardRenderer
            menu={menu as any}
            config={config}
            width={1920}
            height={1080}
            scale={scale}
          />
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Animations are live</span>
        </div>
        <span>·</span>
        <span>
          {menu.menu_sections?.length || 0} sections ·{" "}
          {(menu.menu_sections || []).reduce((sum, s) => sum + (s.menu_items?.length || 0), 0)} items
        </span>
        {menu.menu_template && (
          <>
            <span>·</span>
            <span>Template: {menu.menu_template.name}</span>
          </>
        )}
      </div>
    </div>
  )
}
