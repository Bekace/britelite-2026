"use client"

import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Monitor, Wifi, WifiOff, RotateCcw, Settings, RefreshCw } from "lucide-react"
import { PlaylistPlayer } from "@/components/playlist-player"
import { useDeviceSync } from "@/hooks/use-device-sync"
import { useState, useEffect } from "react"

export default function PlayerPage() {
  const params = useParams()
  const router = useRouter()
  const screenCode = params.screenCode as string

  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [showControls, setShowControls] = useState(true)

  const { screenConfig, playlistContent, isLoading, isOnline, error, lastSync, refreshConfig, retryCount } =
    useDeviceSync({
      screenCode,
      syncInterval: 30000, // 30 seconds
      heartbeatInterval: 10000, // 10 seconds
      retryDelay: 5000, // 5 seconds
      maxRetries: 3,
    })

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [showControls])

  // Handle media rotation for playlists
  const handleMediaChange = (index: number) => {
    setCurrentMediaIndex(index)
  }

  // Get orientation transform
  const getOrientationTransform = () => {
    switch (screenConfig?.orientation) {
      case "90":
        return "rotate-90"
      case "180":
        return "rotate-180"
      case "270":
        return "-rotate-90"
      default:
        return ""
    }
  }

  // Show mouse cursor when moving
  const handleMouseMove = () => {
    setShowControls(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Connecting to screen...</p>
          {retryCount > 0 && <p className="text-sm text-muted-foreground">Retry attempt {retryCount}/3</p>}
        </div>
      </div>
    )
  }

  if (error || !screenConfig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <WifiOff className="h-12 w-12 text-destructive mx-auto" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Connection Failed</h2>
              <p className="text-muted-foreground">{error}</p>
              {retryCount > 0 && <p className="text-sm text-muted-foreground">Failed after {retryCount} attempts</p>}
            </div>
            <div className="space-y-2">
              <Button onClick={refreshConfig} className="w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Retry Connection
              </Button>
              <Button variant="outline" onClick={() => router.push("/player")} className="w-full">
                Back to Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div
      className={`min-h-screen bg-background relative overflow-hidden ${getOrientationTransform()}`}
      onMouseMove={handleMouseMove}
    >
      {/* Content Display */}
      <div className="absolute inset-0">
        {playlistContent?.playlist.media.length ? (
          <PlaylistPlayer
            media={playlistContent.playlist.media}
            backgroundColor={playlistContent.playlist.backgroundColor}
            autoPlay={true}
            showControls={showControls}
            onMediaChange={handleMediaChange}
          />
        ) : screenConfig.contentType === "asset" && screenConfig.contentId ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Monitor className="h-24 w-24 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">Single Asset</h2>
                <p className="text-muted-foreground">Asset ID: {screenConfig.contentId}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Monitor className="h-24 w-24 text-muted-foreground mx-auto" />
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">{screenConfig.name}</h2>
                <p className="text-muted-foreground">No content assigned to this screen</p>
                <p className="text-sm text-muted-foreground">Configure content in your dashboard</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {showControls && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border">
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-destructive" />}
            <span className="text-sm font-medium">{screenConfig.name}</span>
          </div>

          {playlistContent && (
            <div className="text-xs text-muted-foreground border-l pl-2 ml-2">{playlistContent.playlist.name}</div>
          )}

          {lastSync && (
            <div className="text-xs text-muted-foreground border-l pl-2 ml-2">
              Last sync: {lastSync.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Settings Button */}
      {showControls && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshConfig} className="bg-card/90 backdrop-blur-sm">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/player")}
            className="bg-card/90 backdrop-blur-sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      )}
    </div>
  )
}
