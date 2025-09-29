"use client"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, RefreshCw, ArrowLeft, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { CameraAnalytics } from "@/components/camera-analytics"
import CameraSetup from "@/components/camera-setup"

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
    device_code: string
    is_paired: boolean
    screen_id: string
  }
  screen: {
    id: string
    name: string
    orientation: string
    status: string
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
    content: MediaItem[]
  }
}

export default function ContentPlayerPage({ params }: { params: { deviceCode: string } }) {
  const [config, setConfig] = useState<ScreenConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [maxRetries] = useState(3)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const [shuffledContent, setShuffledContent] = useState<MediaItem[]>([])
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  const router = useRouter()
  const [showCameraSetup, setShowCameraSetup] = useState(false)

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

      console.log("[v0] Fetching config for:", params.deviceCode)
      console.log("[v0] Is screen code:", isScreenCode)
      console.log("[v0] API endpoint:", apiEndpoint)

      const response = await fetch(apiEndpoint, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response ok:", response.ok)

      if (!response.ok) {
        const errorData = await response.json()
        console.log("[v0] Error response:", errorData)
        throw new Error(errorData.error || "Failed to fetch configuration")
      }

      const data = await response.json()
      console.log("[v0] API response data:", data)

      let configData
      if (isScreenCode) {
        configData = {
          device: {
            id: `screen-${data.screen.id}`,
            device_code: params.deviceCode,
            is_paired: true,
            screen_id: data.screen.id,
          },
          screen: {
            id: data.screen.id,
            name: data.screen.name,
            orientation: data.screen.orientation || "landscape",
            status: data.screen.status || "active",
            playlist: {
              id: `default-${data.screen.id}`,
              name: "Default Playlist",
              background_color: data.screen.background_color || "#000000",
              scale_image: data.screen.scale_image || "fit",
              scale_video: data.screen.scale_video || "fit",
              scale_document: "fit",
              shuffle: data.screen.shuffle || false,
              default_transition: "fade",
            },
            content: data.screen.content || [],
          },
        }
      } else {
        configData = data
      }

      setConfig(configData)
      setError("")
      setRetryCount(0)

      if (configData.screen.content && configData.screen.playlist?.shuffle) {
        setShuffledContent(shuffleArray(configData.screen.content))
      } else {
        setShuffledContent(configData.screen.content || [])
      }

      if (configData.screen.id) {
        fetchAnalyticsSettings(configData.screen.id)
      }

      if (!isScreenCode) {
        sendHeartbeat()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load configuration"
      setError(errorMessage)

      if (retryCount < maxRetries) {
        const nextRetryCount = retryCount + 1
        setRetryCount(nextRetryCount)

        if (nextRetryCount < maxRetries && !errorMessage.includes("not found")) {
          setTimeout(() => {
            fetchConfig()
          }, Math.pow(2, retryCount) * 1000)
        } else {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    } finally {
      if (retryCount >= maxRetries || error.includes("not found")) {
        setLoading(false)
      }
    }
  }

  const fetchAnalyticsSettings = async (screenId: string) => {
    try {
      const response = await fetch(`/api/analytics/settings?screenId=${screenId}`)

      if (response.ok) {
        const data = await response.json()
        setAnalyticsEnabled(data.enabled || false)
      } else {
        setAnalyticsEnabled(false)
      }
    } catch (err) {
      console.error("Error fetching analytics settings:", err)
      setAnalyticsEnabled(false)
    }
  }

  const sendHeartbeat = async () => {
    try {
      await fetch(`/api/devices/heartbeat/${params.deviceCode}`, {
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

    const isScreenCode = params.deviceCode.startsWith("SCR-")
    let heartbeatInterval: NodeJS.Timeout | null = null

    if (!isScreenCode) {
      heartbeatInterval = setInterval(sendHeartbeat, 30000)
    }

    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval)
      }
    }
  }, [params.deviceCode])

  useEffect(() => {
    const contentToUse = shuffledContent.length > 0 ? shuffledContent : config?.screen.content || []

    if (contentToUse.length === 0) {
      setCurrentMediaIndex(0)
      return
    }

    if (contentToUse.length === 1) {
      return
    }

    const currentMedia = contentToUse[currentMediaIndex]
    if (!currentMedia) {
      setCurrentMediaIndex(0)
      return
    }

    const duration = (currentMedia.duration_override || currentMedia.media.duration || 10) * 1000

    const timer = setTimeout(() => {
      setCurrentMediaIndex((prev) => {
        const nextIndex = prev + 1
        return nextIndex >= contentToUse.length ? 0 : nextIndex
      })
    }, duration)

    return () => clearTimeout(timer)
  }, [currentMediaIndex, shuffledContent, config?.screen.content])

  const handleRetry = () => {
    setRetryCount(0)
    setLoading(true)
    setError("")
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
    if (filePath.startsWith("http")) return filePath
    if (filePath.startsWith("blob/")) return `https://blob.vercel-storage.com/${filePath}`
    return filePath
  }

  const isGoogleSlides = (media: MediaItem["media"]) => {
    return (
      media.mime_type === "application/vnd.google-apps.presentation" ||
      media.name.toLowerCase().includes("google slides") ||
      media.file_path.includes("docs.google.com/presentation")
    )
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
            {retryCount > 0 && <p className="text-sm text-muted-foreground">Failed after {retryCount} attempts</p>}
            <div className="space-y-2">
              {retryCount < maxRetries ? (
                <Button onClick={handleRetry} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry Connection ({maxRetries - retryCount} attempts left)
                </Button>
              ) : (
                <p className="text-sm text-destructive">Maximum retry attempts reached</p>
              )}
              <Button onClick={handleBackToSetup} variant="outline" className="w-full bg-transparent">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Setup
              </Button>
            </div>
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
  const currentMedia = contentToDisplay[currentMediaIndex]

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden" style={getScreenStyles()}>
      <div className="absolute top-4 left-4 z-50">
        <Button
          onClick={() => setShowCameraSetup(true)}
          variant="secondary"
          size="sm"
          className="bg-black/80 backdrop-blur-sm border-white/20 text-white hover:bg-black/90"
        >
          <Settings className="w-4 h-4 mr-2" />
          Camera Setup
        </Button>
      </div>

      {config?.screen.id && analyticsEnabled && (
        <div className="absolute top-4 right-4 z-50 w-80">
          <CameraAnalytics
            screenId={config.screen.id}
            enabled={analyticsEnabled}
            className="bg-black/80 backdrop-blur-sm border-white/20"
          />
        </div>
      )}

      {contentToDisplay && contentToDisplay.length > 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          {currentMedia && (
            <div className="w-full h-full relative">
              {currentMedia.media.mime_type.startsWith("image/") ? (
                <Image
                  src={getMediaUrl(currentMedia.media.file_path) || "/placeholder.svg"}
                  alt={currentMedia.media.name}
                  fill
                  className={getMediaObjectFit("image")}
                  priority
                  unoptimized
                />
              ) : currentMedia.media.mime_type.startsWith("video/") ? (
                <video
                  src={getMediaUrl(currentMedia.media.file_path)}
                  className={`w-full h-full ${getMediaObjectFit("video")}`}
                  autoPlay
                  muted
                  playsInline
                  onEnded={() => {
                    setCurrentMediaIndex((prev) => {
                      const nextIndex = prev + 1
                      return nextIndex >= contentToDisplay.length ? 0 : nextIndex
                    })
                  }}
                />
              ) : isGoogleSlides(currentMedia.media) ? (
                <iframe
                  src={getGoogleSlidesEmbedUrl(currentMedia.media) || ""}
                  className="w-full h-full border-0"
                  allowFullScreen
                  title={currentMedia.media.name}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <p className="text-2xl">{currentMedia.media.name}</p>
                </div>
              )}

              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
                {currentMediaIndex + 1} / {contentToDisplay.length}
              </div>
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
