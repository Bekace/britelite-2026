"use client"
import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, RefreshCw, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

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
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0) // Declare currentMediaIndex
  const router = useRouter()

  const fetchConfig = async () => {
    try {
      console.log("[v0] Fetching device config for:", params.deviceCode)

      const response = await fetch(`/api/devices/config/${params.deviceCode}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      })
      console.log("[v0] Config response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.log("[v0] Config error:", errorData)
        throw new Error(errorData.error || "Failed to fetch configuration")
      }

      const data = await response.json()
      console.log("[v0] Config data:", data)

      setConfig(data)
      setError("")
      setRetryCount(0)

      // Send heartbeat
      sendHeartbeat()
    } catch (err) {
      console.log("[v0] Config fetch error:", err)
      setError(err instanceof Error ? err.message : "Failed to load configuration")

      if (retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1)
        // Auto-retry with exponential backoff
        setTimeout(() => {
          if (retryCount < maxRetries - 1) {
            fetchConfig()
          }
        }, Math.pow(2, retryCount) * 1000) // 1s, 2s, 4s delays
      }
    } finally {
      setLoading(false)
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
      console.log("[v0] Heartbeat error:", err)
    }
  }

  useEffect(() => {
    fetchConfig()

    // Set up heartbeat interval
    const heartbeatInterval = setInterval(sendHeartbeat, 30000) // Every 30 seconds

    return () => clearInterval(heartbeatInterval)
  }, [params.deviceCode])

  // Auto-advance media content
  useEffect(() => {
    if (!config?.screen.content || config.screen.content.length === 0) {
      setCurrentMediaIndex(0)
      return
    }

    const currentMedia = config.screen.content[currentMediaIndex]
    if (!currentMedia) {
      setCurrentMediaIndex(0)
      return
    }

    const duration = currentMedia.duration_override || currentMedia.media.duration || 10000

    const timer = setTimeout(() => {
      setCurrentMediaIndex((prev) => (prev + 1 >= config.screen.content.length ? 0 : prev + 1))
    }, duration)

    return () => clearTimeout(timer)
  }, [currentMediaIndex, config])

  const handleRetry = () => {
    if (retryCount >= maxRetries) {
      setError("Maximum retry attempts reached. Please check your connection and try again.")
      return
    }

    setLoading(true)
    setError("")
    fetchConfig()
  }

  const handleBackToSetup = () => {
    router.push("/player")
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

  const { screen } = config
  const currentMedia = screen.content?.[currentMediaIndex]

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: screen.playlist?.background_color || "#000000",
        orientation: screen.orientation === "portrait" ? "portrait" : "landscape",
      }}
    >
      {screen.content && screen.content.length > 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          {currentMedia && (
            <div className="w-full h-full relative">
              {currentMedia.media.mime_type.startsWith("image/") ? (
                <Image
                  src={currentMedia.media.file_path || "/placeholder.svg"}
                  alt={currentMedia.media.name}
                  fill
                  className="object-contain"
                  priority
                />
              ) : currentMedia.media.mime_type.startsWith("video/") ? (
                <video
                  src={currentMedia.media.file_path}
                  className="w-full h-full object-contain"
                  autoPlay
                  muted
                  onEnded={() => setCurrentMediaIndex((prev) => (prev + 1 >= screen.content.length ? 0 : prev + 1))}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <p className="text-2xl">{currentMedia.media.name}</p>
                </div>
              )}

              {/* Media indicator */}
              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
                {currentMediaIndex + 1} / {screen.content.length}
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
