"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, RefreshCw, ArrowLeft, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CameraAnalytics } from "@/components/camera-analytics"
import CameraSetup from "@/components/camera-setup"
import { useTVNavigation } from "@/hooks/use-tv-navigation"
import { createClient } from "@/lib/supabase/client" // Fixed import path to use correct Supabase client location
import "@/components/ui/spinner.css"

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
      shuffle_content?: boolean
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
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
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
  const [readyQueue, setReadyQueue] = useState<Set<number>>(new Set())
  const [preloadStatus, setPreloadStatus] = useState<string>("")
  const [showDebug, setShowDebug] = useState(false)
  const [imageExtensionCount, setImageExtensionCount] = useState(0)
  const [videoLoopCount, setVideoLoopCount] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const { isTVMode } = useTVNavigation({
    onUp: () => {
      if (!showCameraSetup && !showLeftPanel && !showRightPanel) {
        console.log("[v0] TV Navigation - Up pressed")
        setCurrentIndex((prev) => {
          const newIndex = prev - 1
          return newIndex < 0 ? (shuffledContent.length || config?.screen.content?.length || 1) - 1 : newIndex
        })
      }
    },
    onDown: () => {
      if (!showCameraSetup && !showLeftPanel && !showRightPanel) {
        console.log("[v0] TV Navigation - Down pressed")
        const contentLength = shuffledContent.length || config?.screen.content?.length || 0
        setCurrentIndex((prev) => {
          const newIndex = prev + 1
          return newIndex >= contentLength ? 0 : newIndex
        })
      }
    },
    onLeft: () => {
      if (!showCameraSetup) {
        console.log("[v0] TV Navigation - Left pressed, toggling left panel")
        setShowLeftPanel((prev) => !prev)
        setShowRightPanel(false)
      }
    },
    onRight: () => {
      if (!showCameraSetup) {
        console.log("[v0] TV Navigation - Right pressed, toggling right panel")
        setShowRightPanel((prev) => !prev)
        setShowLeftPanel(false)
      }
    },
    onMenu: () => {
      if (!showCameraSetup) {
        console.log("[v0] TV Navigation - Menu pressed, toggling right panel")
        setShowRightPanel((prev) => !prev)
      }
    },
    onBack: () => {
      console.log("[v0] TV Navigation - Back pressed")
      if (showLeftPanel || showRightPanel) {
        setShowLeftPanel(false)
        setShowRightPanel(false)
      } else if (showCameraSetup) {
        setShowCameraSetup(false)
      }
    },
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
      const apiUrl = isScreenCode ? `/api/screen/${params.deviceCode}` : `/api/devices/config/${params.deviceCode}`

      const response = await fetch(apiUrl)

      if (!response.ok) {
        const errorMsg = `Failed to fetch config: ${response.statusText}`
        throw new Error(errorMsg)
      }

      const data = await response.json()

      console.log("[v0] Player received config with playlist:", {
        hasPlaylist: !!data.screen?.playlist,
        playlistName: data.screen?.playlist?.name,
        scale_video: data.screen?.playlist?.scale_video,
        scale_image: data.screen?.playlist?.scale_image,
        scale_document: data.screen?.playlist?.scale_document,
      })

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

      setLoading(false)
      setHasPendingUpdate(false)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to load configuration"
      setError(errorMsg)
      setLoading(false)
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

  useEffect(() => {
    fetchConfig()

    const supabase = createClient()
    const isScreenCode = params.deviceCode.startsWith("SCR-")

    console.log("[v0] Setting up WebSocket connection for device:", params.deviceCode)

    // Setup real-time subscription for screen updates
    const channel = supabase
      .channel(`player-${params.deviceCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: isScreenCode ? "screens" : "devices",
          filter: isScreenCode ? `code=eq.${params.deviceCode}` : `code=eq.${params.deviceCode}`,
        },
        (payload) => {
          console.log("[v0] WebSocket: Screen update received via realtime:", payload)
          const newUpdatedAt = payload.new?.updated_at

          if (newUpdatedAt && lastUpdatedAtRef.current && newUpdatedAt !== lastUpdatedAtRef.current) {
            console.log("[v0] WebSocket: Update detected! Queueing refresh...")
            setHasPendingUpdate(true)
          }

          lastUpdatedAtRef.current = newUpdatedAt
        },
      )
      .subscribe((status) => {
        console.log("[v0] WebSocket subscription status:", status)
      })

    // Send initial heartbeat immediately
    sendHeartbeat()

    // Send heartbeat every 30 seconds for all player instances
    const heartbeatInterval = setInterval(sendHeartbeat, 30000)

    return () => {
      console.log("[v0] Cleaning up WebSocket subscription and heartbeat")
      supabase.removeChannel(channel)
      clearInterval(heartbeatInterval)
    }
  }, [params.deviceCode])

  useEffect(() => {
    if (!config) return

    if (config.screen?.updated_at) {
      lastUpdatedAtRef.current = config.screen.updated_at
    }

    if (config.screen.content && config.screen.playlist?.shuffle) {
      const shuffled = shuffleArray(config.screen.content)
      setShuffledContent(shuffled)
    } else {
      setShuffledContent(config.screen.content || [])
    }

    if (config.screen.id) {
      console.log("[v0] Analytics enabled by default for testing, screenId:", config.screen.id)
      // fetchAnalyticsSettings(config.screen.id)
    }
  }, [config])

  useEffect(() => {
    if (hasPendingUpdate) {
      console.log("[v0] Pending update detected, refreshing config...")
      const timer = setTimeout(() => {
        fetchConfig()
        setHasPendingUpdate(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [hasPendingUpdate])

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }
  }, [])

  const onYouTubeIframeAPIReady = (iframeId: string) => {
    if (window.YT && window.YT.Player) {
      try {
        youtubePlayerRef.current = new window.YT.Player(iframeId, {
          events: {
            onReady: (event: any) => {
              event.target.playVideo()
            },
          },
        })
      } catch (e) {
        console.error("[v0] Error initializing YouTube player:", e)
      }
    }
  }

  const handleRetry = () => {
    setLoading(true)
    setError(null)
    fetchConfig()
  }

  const handleBackToSetup = () => {
    router.push("/player")
  }

  const handleCameraConfigured = (deviceId: string, settings: MediaTrackSettings) => {
    const cameraConfig = {
      deviceId,
      settings,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem("cameraConfig", JSON.stringify(cameraConfig))
    console.log("[v0] Camera configured and saved:", cameraConfig)
    setShowCameraSetup(false)
    if (analyticsEnabled && config?.screen.id) {
      fetchAnalyticsSettings(config.screen.id)
    }
  }

  const getMediaUrl = (filePath: string) => {
    if (!filePath) return "/placeholder.svg"
    if (filePath.startsWith("http")) return filePath // GCS URLs are already full: https://storage.googleapis.com/...
    return filePath // Fallback for relative paths
  }

  const isGoogleSlides = (media: MediaItem["media"]) => {
    return (
      media.mime_type === "application/vnd.google-apps.presentation" ||
      media.name.toLowerCase().includes("google slides") ||
      media.file_path.includes("docs.google.com/presentation")
    )
  }

  const isYouTubeVideo = (media: MediaItem["media"]) => {
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

      // Convert youtube.com/watch?v= to embed URL
      if (url.includes("youtube.com/watch")) {
        const urlObj = new URL(url)
        const videoId = urlObj.searchParams.get("v")
        if (videoId) {
          embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`
        }
      }
      // Convert youtu.be/ to embed URL
      else if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1]?.split("?")[0]
        if (videoId) {
          embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`
        }
      }
      // If already an embed URL, use youtube-nocookie.com
      else if (url.includes("youtube.com/embed/")) {
        embedUrl = url.replace("youtube.com", "youtube-nocookie.com")
      }

      const urlObj = new URL(embedUrl)
      urlObj.searchParams.set("autoplay", "1")
      urlObj.searchParams.set("mute", "1")
      urlObj.searchParams.set("controls", "0")
      urlObj.searchParams.set("showinfo", "0")
      urlObj.searchParams.set("fs", "0")
      urlObj.searchParams.set("modestbranding", "1")
      urlObj.searchParams.set("iv_load_policy", "3")
      return urlObj.toString()
    } catch (error) {
      console.error("[v0] Error parsing YouTube URL:", error)
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

    const threshold = 50 // pixels from edge to trigger
    const windowWidth = window.innerWidth
    const leftPanelWidth = 256 // w-64 = 16rem = 256px
    const rightPanelWidth = 384 // w-96 = 24rem = 384px

    // Left edge detection - keep open if within panel width
    if (e.clientX < threshold) {
      setShowLeftPanel(true)
    } else if (e.clientX > leftPanelWidth) {
      setShowLeftPanel(false)
    }

    // Right edge detection - keep open if within panel width
    if (e.clientX > windowWidth - threshold) {
      setShowRightPanel(true)
    } else if (e.clientX < windowWidth - rightPanelWidth) {
      setShowRightPanel(false)
    }
  }

  const setLastUpdatedAt = (updatedAt: string | null) => {
    lastUpdatedAtRef.current = updatedAt
  }

  const preloadMedia = useCallback((item: MediaItem, index: number) => {
    console.log(`[v0] Preloader: Starting preload for "${item.media.name}" (index: ${index})`)
    setPreloadStatus(`Preloading: ${item.media.name}`)

    return new Promise<void>((resolve) => {
      // Skip YouTube and Google Slides - can't preload but mark as ready
      if (isYouTubeVideo(item.media) || isGoogleSlides(item.media)) {
        console.log(`[v0] Preloader: Skipping non-preloadable type: ${item.media.mime_type}`)
        setReadyQueue((prev) => new Set(prev).add(index))
        setPreloadStatus(`Ready: ${item.media.name}`)
        resolve()
        return
      }

      if (item.media.mime_type.startsWith("image/")) {
        const img = new window.Image()
        img.crossOrigin = "anonymous"

        img.onload = () => {
          console.log(`[v0] Preloader: ✓ Image ready "${item.media.name}"`)
          setReadyQueue((prev) => new Set(prev).add(index))
          setPreloadStatus(`Ready: ${item.media.name}`)
          resolve()
        }

        img.onerror = (error) => {
          console.error(`[v0] Preloader: ✗ Image failed "${item.media.name}"`, error)
          setPreloadStatus(`Failed: ${item.media.name}`)
          // Do NOT add to ready queue - it's not ready
          resolve()
        }

        img.src = getMediaUrl(item.media.file_path)
      } else if (item.media.mime_type.startsWith("video/")) {
        const video = document.createElement("video")
        video.crossOrigin = "anonymous"
        video.preload = "auto"

        video.onloadeddata = () => {
          console.log(`[v0] Preloader: ✓ Video ready "${item.media.name}"`)
          setReadyQueue((prev) => new Set(prev).add(index))
          setPreloadStatus(`Ready: ${item.media.name}`)
          resolve()
        }

        video.onerror = (error) => {
          console.error(`[v0] Preloader: ✗ Video failed "${item.media.name}"`, error)
          setPreloadStatus(`Failed: ${item.media.name}`)
          // Do NOT add to ready queue - it's not ready
          resolve()
        }

        video.src = getMediaUrl(item.media.file_path)
      } else {
        console.log(`[v0] Preloader: Non-media type, marking ready: ${item.media.mime_type}`)
        setReadyQueue((prev) => new Set(prev).add(index))
        setPreloadStatus(`Ready: ${item.media.name}`)
        resolve()
      }

      // Timeout after 8 seconds - item not ready
      setTimeout(() => {
        console.log(`[v0] Preloader: ⏱ Timeout "${item.media.name}" - not adding to ready queue`)
        setPreloadStatus(`Timeout: ${item.media.name}`)
        // Do NOT add to ready queue - it timed out
        resolve()
      }, 8000)
    })
  }, [])

  useEffect(() => {
    const contentToDisplay = shuffledContent.length > 0 ? shuffledContent : config?.screen.content || []
    if (contentToDisplay.length === 0) return

    // Preload next 3 items for safety buffer
    const itemsToPreload = [1, 2, 3].map((offset) => {
      const targetIndex = (currentIndex + offset) % contentToDisplay.length
      return { item: contentToDisplay[targetIndex], index: targetIndex }
    })

    console.log(`[v0] Preloader: Starting aggressive preload for next 3 items from index ${currentIndex}`)

    // Preload all 3 simultaneously
    itemsToPreload.forEach(({ item, index }) => {
      if (!readyQueue.has(index)) {
        preloadMedia(item, index)
      }
    })
  }, [currentIndex, shuffledContent, config, preloadMedia, readyQueue])

  useEffect(() => {
    if (config?.screen.content && config.screen.content.length > 0) {
      console.log(`[v0] Initial load: Adding first item (index 0) to ready queue`)
      setReadyQueue(new Set([0]))
    }
  }, [config])

  const advanceToNextMedia = useCallback(() => {
    if (!config || !config.screen.content || config.screen.content.length === 0) return

    const contentToDisplay = shuffledContent.length > 0 ? shuffledContent : config?.screen.content || []
    const nextIndex = (currentIndex + 1) % contentToDisplay.length
    const currentMedia = contentToDisplay[currentIndex]

    console.log(`[v0] Advancement: Attempting to advance from index ${currentIndex} to ${nextIndex}`)
    console.log(`[v0] Advancement: Ready queue contains: [${Array.from(readyQueue).join(", ")}]`)
    console.log(`[v0] Advancement: Next item ${nextIndex} ready? ${readyQueue.has(nextIndex)}`)

    // Check if next sequential item is ready
    if (readyQueue.has(nextIndex)) {
      console.log(`[v0] Advancement: ✓ Next item ready, advancing to ${nextIndex}`)
      setCurrentIndex(nextIndex)
      setImageExtensionCount(0)
      setVideoLoopCount(0)
      return
    }

    // Next item not ready - apply adaptive strategies
    const isVideo = currentMedia?.media.mime_type.startsWith("video/") && !isYouTubeVideo(currentMedia.media)
    const isImage = currentMedia?.media.mime_type.startsWith("image/")

    // Strategy 1: Extend image duration up to 3 seconds
    if (isImage && imageExtensionCount < 1) {
      console.log(`[v0] Advancement: ⏱ Extending image duration by 3 seconds`)
      setImageExtensionCount((prev) => prev + 1)
      setTimeout(() => {
        advanceToNextMedia()
      }, 3000)
      return
    }

    // Strategy 2: Loop video once
    if (isVideo && videoLoopCount < 1) {
      console.log(`[v0] Advancement: 🔁 Looping video once`)
      setVideoLoopCount((prev) => prev + 1)
      if (videoRef.current) {
        videoRef.current.currentTime = 0
        videoRef.current.play()
      }
      return
    }

    // Strategy 3: Find any ready item from the queue (ONLY ready items)
    const readyIndices = Array.from(readyQueue).filter((idx) => idx !== currentIndex)
    if (readyIndices.length > 0) {
      // Pick the next ready item in sequence, or wrap to first ready item
      const nextReadyIndex = readyIndices.find((idx) => idx > currentIndex) || readyIndices[0]
      console.log(`[v0] Advancement: 📦 Switching to ready item at index ${nextReadyIndex}`)
      setCurrentIndex(nextReadyIndex)
      setImageExtensionCount(0)
      setVideoLoopCount(0)
      return
    }

    // No ready items at all - stay on current item and keep trying
    console.log(`[v0] Advancement: ⚠ No ready items available, staying on current item`)
    // Try again in 3 seconds
    setTimeout(() => {
      advanceToNextMedia()
    }, 3000)
  }, [currentIndex, shuffledContent, config, readyQueue, imageExtensionCount, videoLoopCount])

  useEffect(() => {
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current)
    }

    const contentToDisplay = shuffledContent.length > 0 ? shuffledContent : config?.screen.content || []
    const currentMedia = contentToDisplay[currentIndex]

    if (!currentMedia) return

    const isRegularVideo = currentMedia.media.mime_type.startsWith("video/") && !isYouTubeVideo(currentMedia.media)

    // Only set timer for non-video content
    if (!isRegularVideo) {
      const duration = currentMedia.duration_override
        ? currentMedia.duration_override * 1000
        : currentMedia.media.duration
          ? currentMedia.media.duration * 1000
          : 10000

      console.log(`[v0] Timer: Setting ${duration}ms timer for "${currentMedia.media.name}"`)
      rotationTimerRef.current = setTimeout(() => {
        console.log(`[v0] Timer: Timer expired for "${currentMedia.media.name}"`)
        advanceToNextMedia()
      }, duration)
    }

    return () => {
      if (rotationTimerRef.current) {
        clearTimeout(rotationTimerRef.current)
      }
    }
  }, [currentIndex, shuffledContent, config, advanceToNextMedia])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-xl font-semibold">Loading Content</h2>
            <p className="text-muted-foreground">Fetching screen configuration...</p>
          </CardContent>
        </Card>
      </div>
    )
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

  console.log("[v0] Rendering player with:", {
    totalContent: screen.content.length,
    currentIndex: currentIndex,
    currentMedia: screen.content[currentIndex]
      ? {
          id: screen.content[currentIndex].id,
          type: screen.content[currentIndex].media?.type,
          name: screen.content[currentIndex].media?.name,
        }
      : null,
  })

  console.log("[v0] Player page render - Analytics component conditions:", {
    hasScreenId: !!config?.screen.id,
    analyticsEnabled,
    screenId: config?.screen.id,
    willRenderAnalytics: !!(config?.screen.id && analyticsEnabled),
  })

  console.log("[v0] === CONTENT DISPLAY DEBUG ===")
  console.log("[v0] config object:", config)
  console.log("[v0] screen object:", screen)
  console.log("[v0] screen.content:", screen.content)
  console.log("[v0] screen.content type:", typeof screen.content)
  console.log("[v0] screen.content is array:", Array.isArray(screen.content))
  console.log("[v0] screen.content length:", screen.content?.length)
  console.log("[v0] shuffledContent:", shuffledContent)
  console.log("[v0] shuffledContent length:", shuffledContent.length)
  console.log("[v0] contentToDisplay:", screen.content)
  console.log("[v0] contentToDisplay length:", screen.content?.length)
  console.log("[v0] currentIndex:", currentIndex)
  console.log("[v0] currentMedia:", screen.content[currentIndex])
  console.log("[v0] Will show content:", screen.content && screen.content.length > 0)

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden ${isTVMode ? "tv-mode" : ""}`}
      style={{
        backgroundColor: config?.screen.playlist?.background_color || "#000000",
        cursor: isTVMode ? "none" : "default",
      }}
      onMouseMove={handleMouseMove}
    >
      {showDebug && (
        <div className="absolute top-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg text-sm max-w-md border border-cyan-500">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-cyan-400">TV Debug Panel</h3>
            <button onClick={() => setShowDebug(false)} className="text-white hover:text-red-500">
              ✕
            </button>
          </div>
          <div className="space-y-1">
            <div>
              Device Code: <span className="text-cyan-400">{params.deviceCode}</span>
            </div>
            <div>
              API Called: <span className={true ? "text-green-400" : "text-red-400"}>{true ? "✓" : "✗"}</span>
            </div>
            <div>
              Config Set: <span className={true ? "text-green-400" : "text-red-400"}>{true ? "✓" : "✗"}</span>
            </div>
            <div>
              Content Items: <span className="text-yellow-400">{screen.content?.length}</span>
            </div>
            <div>
              Shuffled Items: <span className="text-yellow-400">{shuffledContent.length}</span>
            </div>
            <div>
              Display Array Length: <span className="text-yellow-400">{screen.content?.length}</span>
            </div>
            {null && <div className="text-red-400 mt-2">Error: {null}</div>}
            {true && (
              <div className="mt-2 border-t border-cyan-700 pt-2">
                <div className="text-xs">
                  <div>Has Screen: {true ? "✓" : "✗"}</div>
                  <div>Has Content: {true ? "✓" : "✗"}</div>
                  <div>Content Count: {screen.content?.length}</div>
                  {true && (
                    <div className="mt-1">
                      <div className="font-semibold">Items:</div>
                      {screen.content?.map((item: any, idx: number) => (
                        <div key={idx} className="ml-2 text-gray-300">
                          {idx + 1}. {item.media.name} ({item.media.mime_type})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-black/80 backdrop-blur-sm border-r border-white/20 z-50 transition-transform duration-300 ease-in-out ${
          showLeftPanel ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 space-y-4">
          <Button
            onClick={() => setShowCameraSetup(true)}
            variant="secondary"
            className="w-full bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 tv-focusable tv-button"
            autoFocus={showLeftPanel}
          >
            <Settings className="w-4 h-4 mr-2" />
            Camera Setup
          </Button>
        </div>
      </div>
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-black/80 backdrop-blur-sm border-l border-white/20 z-50 transition-transform duration-300 ease-in-out ${
          showRightPanel ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4 h-full overflow-y-auto">
          {config?.screen.id && analyticsEnabled && (
            <>
              {console.log("[v0] Rendering CameraAnalytics in right panel with screenId:", config.screen.id)}
              <CameraAnalytics
                screenId={config.screen.id}
                enabled={analyticsEnabled}
                onToggle={setAnalyticsEnabled}
                onSetupClick={() => setShowCameraSetup(true)}
                className="bg-transparent border-0"
              />
            </>
          )}
        </div>
      </div>
      {screen.content && screen.content.length > 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          {screen.content[currentIndex] && (
            <div className="w-full h-full relative">
              {isGoogleSlides(screen.content[currentIndex].media) ? (
                <iframe
                  key={screen.content[currentIndex].id}
                  src={screen.content[currentIndex].media.file_path}
                  className="w-full h-full border-0"
                  allow="autoplay"
                  title={screen.content[currentIndex].media.name}
                />
              ) : isYouTubeVideo(screen.content[currentIndex].media) ? (
                <iframe
                  key={screen.content[currentIndex].id}
                  id={`youtube-player-${screen.content[currentIndex].id}`}
                  src={getYouTubeUrlWithAutoplay(screen.content[currentIndex].media.file_path)}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  title={screen.content[currentIndex].media.name}
                  onLoad={() => {
                    setTimeout(() => {
                      onYouTubeIframeAPIReady(`youtube-player-${screen.content[currentIndex].id}`)
                    }, 1000)
                  }}
                />
              ) : screen.content[currentIndex].media.mime_type.startsWith("video/") ? (
                <video
                  ref={videoRef}
                  key={screen.content[currentIndex].id}
                  src={getMediaUrl(screen.content[currentIndex].media.file_path)}
                  className={`w-full h-full ${getMediaObjectFit("video")}`}
                  autoPlay
                  muted
                  playsInline
                  onEnded={advanceToNextMedia}
                />
              ) : screen.content[currentIndex].media.mime_type.startsWith("image/") ? (
                <Image
                  src={getMediaUrl(screen.content[currentIndex].media.file_path) || "/placeholder.svg"}
                  alt={screen.content[currentIndex].media.name}
                  fill
                  className={getMediaObjectFit("image")}
                  priority
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <p className="text-2xl">{screen.content[currentIndex].media.name}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0a2a3a] text-white">
          <div className="text-center space-y-4">
            <div className="text-6xl">📺</div>
            <h2 className="text-3xl font-light">No content assigned</h2>
            <p className="text-xl text-gray-400">Assign content to this screen in your dashboard</p>
          </div>
        </div>
      )}
      {preloadStatus && (
        <div className="fixed bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white/70 px-3 py-1.5 rounded text-xs font-mono z-50 max-w-xs truncate">
          {preloadStatus}
        </div>
      )}
    </div>
  )
}
