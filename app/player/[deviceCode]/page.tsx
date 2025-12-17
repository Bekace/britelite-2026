"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CameraAnalytics } from "@/components/camera-analytics"
import CameraSetup from "@/components/camera-setup"
import { useTVNavigation } from "@/hooks/use-tv-navigation"
import { PlayerSplash } from "@/components/player-splash"
import { createClient } from "@/lib/supabase/client"
import { preloadYouTubeIframe } from "@/lib/youtube-utils" // Declare the variable before using it

interface MediaItem {
  id: string
  position: number
  duration_override: number | null
  transition_type: string | null
  transition_duration: number | null
  media: {
    id: string
    name: string
    file_path: string
    mime_type: string
    file_size: number
    duration: number | null
    url: string
  }
}

interface ScreenConfig {
  device: {
    id: string
    code: string
    name: string
    orientation: string
    resolution: string
  }
  screen: {
    id: string
    name: string
    content: MediaItem[]
    playlist: {
      id: string
      name: string
      background_color: string
      scale_image?: string
      scale_video?: string
      scale_document?: string
      shuffle?: boolean
      default_transition?: string
    } | null
    updated_at: string
  }
}

interface PlayerPageProps {
  params: { deviceCode: string }
}

export default function PlayerPage({ params }: PlayerPageProps) {
  const [config, setConfig] = useState<ScreenConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [error, setError] = useState<string>("")
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [shuffledContent, setShuffledContent] = useState<MediaItem[]>([])
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)
  const router = useRouter()
  const [showCameraSetup, setShowCameraSetup] = useState(false)
  const [showLeftPanel, setShowLeftPanel] = useState(false)
  const [showRightPanel, setShowRightPanel] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<ScreenConfig | null>(null)
  const [updateProgress, setUpdateProgress] = useState(0)
  const lastUpdatedAtRef = useRef<string | null>(null)
  const [hasPendingUpdate, setHasPendingUpdate] = useState(false)
  const configRef = useRef<ScreenConfig | null>(null)
  const rotationTimerRef = useRef<NodeJS.Timeout | null>(null)
  const youtubePlayerRef = useRef<any>(null)

  const [statusMessage, setStatusMessage] = useState<string>("")
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showStatus = (message: string, duration?: number) => {
    setStatusMessage(message)

    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current)
    }

    if (duration !== 0) {
      statusTimeoutRef.current = setTimeout(() => {
        setStatusMessage("")
      }, duration || 3000)
    }
  }

  const handleNavigateUp = () => {
    if (showLeftPanel || showRightPanel) {
      return false
    }

    if (!showCameraSetup) {
      setCurrentMediaIndex((prev) => {
        const contentLength = shuffledContent.length
        const newIndex = prev - 1
        return newIndex < 0 ? contentLength - 1 : newIndex
      })
      return true
    }
    return false
  }

  const handleNavigateDown = () => {
    if (showLeftPanel || showRightPanel) {
      return false
    }

    if (!showCameraSetup) {
      const contentLength = shuffledContent.length
      setCurrentMediaIndex((prev) => {
        const newIndex = prev + 1
        return newIndex >= contentLength ? 0 : newIndex
      })
      return true
    }
    return false
  }

  const handleNavigateLeft = () => {
    if (showLeftPanel || showRightPanel) {
      return false
    }

    if (!showCameraSetup) {
      setShowLeftPanel(true)
      setShowRightPanel(false)
      return true
    }
    return false
  }

  const handleNavigateRight = () => {
    if (showLeftPanel || showRightPanel) {
      return false
    }

    if (!showCameraSetup) {
      setShowRightPanel(true)
      setShowLeftPanel(false)
      return true
    }
    return false
  }

  const handleMenu = () => {
    if (!showCameraSetup) {
      setShowRightPanel((prev) => !prev)
      setShowLeftPanel(false)
      return true
    }
    return false
  }

  const handleBack = () => {
    if (showLeftPanel || showRightPanel) {
      setShowLeftPanel(false)
      setShowRightPanel(false)
      return true
    } else if (showCameraSetup) {
      setShowCameraSetup(false)
      return true
    } else {
      if (typeof window !== "undefined" && window.close) {
        window.close()
      }
      return true
    }
  }

  const handleRetry = () => {
    setLoading(true)
    setError("")
    fetchConfig()
  }

  const handleBackToSetup = () => {
    router.push("/setup")
  }

  const handleCameraConfigured = () => {
    setShowCameraSetup(false)
    showStatus("Camera setup complete", 3000)
  }

  const { isTVMode } = useTVNavigation({
    onUp: handleNavigateUp,
    onDown: handleNavigateDown,
    onLeft: handleNavigateLeft,
    onRight: handleNavigateRight,
    onMenu: handleMenu,
    onBack: handleBack,
    enabled: !loading && !error,
  })

  const shuffleArray = (array: MediaItem[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const fetchConfig = async () => {
    try {
      const isScreenCode = params.deviceCode.startsWith("SCR-")
      const apiEndpoint = isScreenCode
        ? `/api/screens/config/${params.deviceCode}`
        : `/api/devices/config/${params.deviceCode}`

      const response = await fetch(apiEndpoint, {
        cache: "no-store",
      })

      if (!response.ok) {
        const errorText = await response.text()
        showStatus(`Error: ${response.status === 404 ? "Screen not found" : "Connection failed"}`, 0)
        throw new Error(`Failed to fetch config: ${response.status}`)
      }

      const data = await response.json()

      if (data.screen?.content) {
        data.screen.content.forEach((item: any, index: number) => {
          console.log(`[v0] Content item ${index}:`, {
            id: item.id,
            type: item.media?.type,
            name: item.media?.name,
            url: item.media?.url,
          })
        })
      } else {
        console.log("[v0] No content array in response!")
      }

      const mappedConfig: ScreenConfig = {
        device: {
          id: data.screen.id,
          code: params.deviceCode,
          name: data.screen.name,
          orientation: data.screen.orientation,
          resolution: data.screen.resolution,
        },
        screen: {
          id: data.screen.id,
          name: data.screen.name,
          content: data.screen.content || [],
          playlist: data.screen.playlist || null,
          updated_at: data.screen.updated_at,
        },
      }

      setConfig(mappedConfig)
      configRef.current = mappedConfig

      if (mappedConfig.screen?.updated_at) {
        lastUpdatedAtRef.current = mappedConfig.screen.updated_at
      }

      setLoading(false)
      setHasPendingUpdate(false)

      showStatus("Screen loaded", 3000)
    } catch (err) {
      console.error("[v0] Error fetching config:", err)
      setError(err instanceof Error ? err.message : "Failed to load configuration")
      setLoading(false)
      showStatus("Error: Failed to load configuration", 0)
    }
  }

  const fetchAnalyticsSettings = async (screenId: string) => {
    console.log("[v0] fetchAnalyticsSettings temporarily disabled, using default enabled state")
    return

    /* Original code - temporarily disabled
    try {
      console.log("[v0] Fetching analytics settings for screen:", screenId)
      const response = await fetch(`/api/analytics/settings?screenId=${screenId}`)

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Analytics settings fetched:", data)
        setAnalyticsEnabled(data.enabled || false)
      } else {
        console.log("[v0] Failed to fetch analytics settings, status:", response.status)
        setAnalyticsEnabled(false)
      }
    } catch (err) {
      console.error("[v0] Error fetching analytics settings:", err)
      setAnalyticsEnabled(false)
    }
    */
  }

  const sendHeartbeat = async () => {
    try {
      const isScreenCode = params.deviceCode.startsWith("SCR-")
      const heartbeatEndpoint = isScreenCode
        ? `/api/screens/heartbeat/${params.deviceCode}`
        : `/api/devices/heartbeat/${params.deviceCode}`

      await fetch(heartbeatEndpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: new Date().toISOString() }),
      })
    } catch (err) {
      // Silent fail for heartbeat
    }
  }

  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null)

  useEffect(() => {
    fetchConfig()

    const checkForUpdates = async () => {
      if (!configRef.current) {
        return
      }

      try {
        const isScreenCode = params.deviceCode.startsWith("SCR-")
        const apiEndpoint = isScreenCode
          ? `/api/screens/config/${params.deviceCode}`
          : `/api/devices/config/${params.deviceCode}`

        const response = await fetch(apiEndpoint, {
          cache: "no-store",
        })

        if (response.ok) {
          const data = await response.json()
          const newUpdatedAt = data.screen?.updated_at

          if (newUpdatedAt && lastUpdatedAtRef.current && newUpdatedAt !== lastUpdatedAtRef.current) {
            setHasPendingUpdate(true)
          }

          lastUpdatedAtRef.current = newUpdatedAt
        }
      } catch (error) {
        console.error("[v0] Polling: Error checking for updates:", error)
      }
    }

    let heartbeatInterval: NodeJS.Timeout | null = null
    let pollingInterval: NodeJS.Timeout | null = null

    sendHeartbeat()

    heartbeatInterval = setInterval(sendHeartbeat, 30000)

    setTimeout(() => {
      pollingInterval = setInterval(checkForUpdates, 15000)
    }, 5000)

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
    }
  }, [params.deviceCode])

  useEffect(() => {
    if (!config) return

    if (config.screen?.updated_at) {
      lastUpdatedAtRef.current = config.screen.updated_at
    }

    if (config.screen.content && config.screen.playlist?.shuffle) {
      setShuffledContent(shuffleArray(config.screen.content))
    } else {
      setShuffledContent(config.screen.content || [])
    }

    if (config.screen.id) {
      console.log("[v0] Analytics enabled by default for testing, screenId:", config.screen.id)
      // fetchAnalyticsSettings(config.screen.id)
    }
  }, [config])

  useEffect(() => {
    if (!hasPendingUpdate) return

    setStatusMessage("updating content")

    const waitForTransition = async () => {
      try {
        await fetchConfig()
        setStatusMessage("screen updated")
        setTimeout(() => setStatusMessage(""), 3000)
        setHasPendingUpdate(false)
      } catch (error) {
        console.error("[v0] Failed to fetch new config during transition:", error)
        setStatusMessage("error: failed to update")
        setTimeout(() => setStatusMessage(""), 5000)
        setHasPendingUpdate(false)
      }
    }

    waitForTransition()
  }, [hasPendingUpdate])

  useEffect(() => {
    if (showLeftPanel || showRightPanel) {
      setTimeout(() => {
        const firstFocusable = document.querySelector(".tv-focusable") as HTMLElement
        if (firstFocusable) {
          firstFocusable.focus()
        }
      }, 100)
    }
  }, [showLeftPanel, showRightPanel])

  useEffect(() => {
    const minSplashTime = setTimeout(() => {
      setShowSplash(false)
    }, 3000)

    return () => clearTimeout(minSplashTime)
  }, [])

  useEffect(() => {
    if (!params.deviceCode) return

    const supabase = createClient()

    const channel = supabase
      .channel(`screen-updates-${params.deviceCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "screens",
          filter: `device_code=eq.${params.deviceCode}`,
        },
        (payload) => {
          console.log("[v0] Received real-time screen update:", payload)
          showStatus("updating content", 2000)
          setHasPendingUpdate(true)
        },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          console.log("[v0] WebSocket error, falling back to polling")
        }
      })

    const fallbackPolling = setInterval(async () => {
      if (!configRef.current) return

      try {
        console.log("[v0] Fallback polling: Checking for updates...")

        const isScreenCode = params.deviceCode.startsWith("SCR-")
        const apiEndpoint = isScreenCode
          ? `/api/screens/config/${params.deviceCode}`
          : `/api/devices/config/${params.deviceCode}`

        const response = await fetch(apiEndpoint, {
          cache: "no-store",
        })

        if (response.ok) {
          const data = await response.json()
          const newUpdatedAt = data.screen?.updated_at

          if (newUpdatedAt && lastUpdatedAtRef.current && newUpdatedAt !== lastUpdatedAtRef.current) {
            setHasPendingUpdate(true)
            lastUpdatedAtRef.current = newUpdatedAt
          }
        }
      } catch (error) {
        console.error("[v0] Fallback polling: Error checking for updates:", error)
      }
    }, 60000)

    let heartbeatInterval: NodeJS.Timeout | null = null

    sendHeartbeat()

    heartbeatInterval = setInterval(sendHeartbeat, 30000)

    return () => {
      channel.unsubscribe()
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
      clearInterval(fallbackPolling)
    }
  }, [config, params.deviceCode])

  useEffect(() => {
    if (!config || !shuffledContent.length) {
      return
    }

    const currentMedia = shuffledContent[currentMediaIndex]

    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current)
      rotationTimerRef.current = null
    }

    if (!currentMedia.media || !currentMedia.media.file_path || !currentMedia.media.mime_type) {
      console.error("[v0] Invalid media item, missing required properties:", currentMedia)
      return
    }

    const isRegularVideo =
      currentMedia.media.mime_type.startsWith("video/") &&
      !currentMedia.media.file_path.includes("youtube.com") &&
      !currentMedia.media.file_path.includes("youtu.be")

    const isYouTube = isYouTubeVideo(currentMedia.media)

    if (!isRegularVideo) {
      const duration = getEffectiveDuration(currentMedia)
      rotationTimerRef.current = setTimeout(() => {
        advanceToNextMedia()
      }, duration)
    }

    return () => {
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current)
        rotationTimerRef.current = null
      }
    }
  }, [config, shuffledContent])

  useEffect(() => {
    if (shuffledContent.some((item) => isYouTubeVideo(item.media))) {
      preloadYouTubeIframe("")
    }
  }, [shuffledContent])

  const getEffectiveDuration = (item: MediaItem): number => {
    if (item.duration_override && item.duration_override > 0) {
      return item.duration_override * 1000
    }
    if (item.media.duration && item.media.duration > 0) {
      return item.media.duration * 1000
    }
    return 10000
  }

  const advanceToNextMedia = () => {
    setCurrentMediaIndex((prev) => {
      const contentLength = shuffledContent.length || config?.screen.content?.length || 0
      const nextIndex = prev + 1
      return nextIndex >= contentLength ? 0 : nextIndex
    })
  }

  const getMediaUrl = (filePath: string) => {
    if (!filePath) return "/placeholder.svg"
    if (filePath.startsWith("http")) return filePath
    if (filePath.startsWith("blob/")) return `https://blob.vercel-storage.com/${filePath}`
    return filePath
  }

  const isGoogleSlides = (media: MediaItem["media"]) => {
    if (!media || !media.file_path) return false
    return (
      media.mime_type === "application/vnd.google-apps.presentation" ||
      (media.name && media.name.toLowerCase().includes("google slides")) ||
      media.file_path.includes("docs.google.com/presentation")
    )
  }

  const isYouTubeVideo = (media: MediaItem["media"]) => {
    if (!media || !media.file_path) return false
    return (
      media.mime_type === "video/youtube" ||
      media.file_path.includes("youtube.com") ||
      media.file_path.includes("youtu.be") ||
      media.file_path.includes("youtube-nocookie.com")
    )
  }

  const getYouTubeUrlWithAutoplay = (url: string) => {
    try {
      let embedUrl = url

      if (url.includes("youtube.com/watch")) {
        const urlObj = new URL(url)
        const videoId = urlObj.searchParams.get("v")
        if (videoId) {
          embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`
        }
      } else if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1]?.split("?")[0]
        if (videoId) {
          embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`
        }
      } else if (url.includes("youtube.com/embed/")) {
        embedUrl = url.replace("youtube.com", "youtube-nocookie.com")
      }

      const urlObj = new URL(embedUrl)
      urlObj.searchParams.set("enablejsapi", "1")
      urlObj.searchParams.set("autoplay", "1")
      urlObj.searchParams.set("mute", "1")
      urlObj.searchParams.set("controls", "0")
      urlObj.searchParams.set("showinfo", "0")
      urlObj.searchParams.set("fs", "0")
      urlObj.searchParams.set("modestbranding", "1")
      urlObj.searchParams.set("iv_load_policy", "3")
      return urlObj.toString()
    } catch (e) {
      console.error("[v0] Error parsing YouTube URL:", e)
      return url
    }
  }

  const getGoogleSlidesEmbedUrl = (media: MediaItem["media"]) => {
    let presentationId = ""

    if (media.file_path.includes("docs.google.com/presentation")) {
      const match = media.file_path.match(/\/presentation\/d\/([a-zA-Z0-9-_]+)/)
      if (match) presentationId = match[1]
    } else if (media.name.includes("-")) {
      const parts = media.name.split("-")
      presentationId = parts[parts.length - 1].trim()
    }

    if (presentationId) {
      return `https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000&rm=minimal&chrome=false`
    }

    return null
  }

  const getScreenStyles = () => {
    const isPortrait = config?.screen.orientation === "portrait"
    return {
      backgroundColor: config?.screen.playlist?.background_color || "#000000",
      width: "100vw",
      height: "100vh",
      transform: isPortrait ? "rotate(90deg)" : "none",
      transformOrigin: "center center",
    }
  }

  const getMediaObjectFit = (mediaType: "image" | "video" | "document") => {
    const playlist = config?.screen.playlist
    if (!playlist) return "object-contain"

    let scaleValue = "fit"
    switch (mediaType) {
      case "image":
        scaleValue = playlist.scale_image || "fit"
        break
      case "video":
        scaleValue = playlist.scale_video || "fit"
        break
      case "document":
        scaleValue = playlist.scale_document || "fit"
        break
    }

    switch (scaleValue) {
      case "fill":
        return "object-cover"
      case "stretch":
        return "object-fill"
      case "center":
        return "object-none"
      case "fit":
      default:
        return "object-contain"
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isTVMode) return

    const threshold = 50
    const windowWidth = window.innerWidth
    const leftPanelWidth = 256
    const rightPanelWidth = 384

    if (e.clientX < threshold) {
      setShowLeftPanel(true)
    } else if (e.clientX > leftPanelWidth) {
      setShowLeftPanel(false)
    }

    if (e.clientX > windowWidth - threshold) {
      setShowRightPanel(true)
    } else if (e.clientX < windowWidth - rightPanelWidth) {
      setShowRightPanel(false)
    }
  }

  if (loading || showSplash) {
    return <PlayerSplash />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-destructive">Connection Failed</h2>
            <p className="text-muted-foreground">Screen configuration not found</p>
            {error && <p className="text-sm text-muted-foreground">{error}</p>}
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </Button>
            <Button onClick={handleBackToSetup} variant="outline" className="w-full bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">No Configuration</h2>
            <p className="text-muted-foreground">Screen configuration not available</p>
            <Button onClick={handleBackToSetup} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showCameraSetup) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Camera Setup</h1>
            <Button onClick={() => setShowCameraSetup(false)} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Player
            </Button>
          </div>

          <CameraSetup onCameraConfigured={handleCameraConfigured} />
        </div>
      </div>
    )
  }

  const { screen } = config
  const contentToDisplay = shuffledContent.length > 0 ? shuffledContent : screen.content || []
  const currentMediaItem = contentToDisplay[currentMediaIndex]

  setCurrentMedia(currentMediaItem)

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden ${isTVMode ? "tv-mode" : ""}`}
      style={getScreenStyles()}
    >
      {statusMessage && (
        <div className="fixed bottom-2 left-2 z-50 rounded px-2 py-1 text-[10px] bg-black/30 text-gray-500 border border-gray-700/30 opacity-60">
          {statusMessage}
        </div>
      )}

      {pendingUpdate && updateProgress > 0 && (
        <div className="fixed top-2 right-2 text-[10px] text-white/40 font-mono z-50">
          {Math.round(updateProgress)}%
        </div>
      )}

      {isTVMode && (
        <div className="absolute top-4 right-4 bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium z-50">
          TV Mode
        </div>
      )}
      {showLeftPanel && (
        <div className="fixed left-0 top-0 h-full bg-background border-r border-border z-40 p-4 overflow-y-auto flex flex-col w-96">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4">Camera Setup</h3>
            <CameraSetup onClose={() => setShowLeftPanel(false)} onCameraConfigured={handleCameraConfigured} />
          </div>
          <Button onClick={() => setShowLeftPanel(false)} className="tv-focusable w-full mt-6" variant="outline">
            Back
          </Button>
        </div>
      )}

      {showRightPanel && (
        <div className="fixed right-0 top-0 h-full bg-background border-l border-border z-40 p-4 overflow-y-auto flex flex-col w-96">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4">Audience Analytics</h3>
            <CameraAnalytics
              screenId={config?.screen.id || ""}
              enabled={analyticsEnabled}
              onToggle={setAnalyticsEnabled}
              onSetupClick={() => {
                setShowRightPanel(false)
                setShowLeftPanel(true)
              }}
            />
          </div>
          <Button onClick={() => setShowRightPanel(false)} className="tv-focusable w-full mt-6" variant="outline">
            Back
          </Button>
        </div>
      )}
      {contentToDisplay && contentToDisplay.length > 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          {currentMediaItem && (
            <div className="w-full h-full relative">
              {currentMediaItem.media.mime_type.startsWith("image/") ? (
                <Image
                  src={getMediaUrl(currentMediaItem.media.file_path) || "/placeholder.svg"}
                  alt={currentMediaItem.media.name}
                  fill
                  className={getMediaObjectFit("image")}
                  priority
                  unoptimized
                />
              ) : isYouTubeVideo(currentMediaItem.media) ? (
                <iframe
                  key={currentMediaItem.id}
                  id={`youtube-player-${currentMediaItem.id}`}
                  src={getYouTubeUrlWithAutoplay(currentMediaItem.media.file_path)}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  title={currentMediaItem.media.name}
                  loading="eager"
                />
              ) : currentMediaItem.media.mime_type.startsWith("video/") ? (
                <video
                  src={getMediaUrl(currentMediaItem.media.file_path)}
                  className={`w-full h-full ${getMediaObjectFit("video")}`}
                  autoPlay
                  muted
                  playsInline
                  onEnded={advanceToNextMedia}
                />
              ) : isGoogleSlides(currentMediaItem.media) ? (
                <iframe
                  src={getGoogleSlidesEmbedUrl(currentMediaItem.media) || ""}
                  className="w-full h-full border-0"
                  allowFullScreen
                  title={currentMediaItem.media.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <p className="text-2xl">{currentMediaItem.media.name}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center space-y-4 text-white">
          <h2 className="text-3xl font-bold">{screen.name}</h2>
          <p className="text-xl">No content assigned</p>
          <p className="text-muted-foreground">Waiting for content to be added to this screen</p>
        </div>
      )}
    </div>
  )
}
