"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, CameraOff, Eye, EyeOff, AlertCircle, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { analyzeFrame, initializeModels, cleanup } from "@/lib/ai/vision-analytics"

interface CameraAnalyticsProps {
  screenId: string
  enabled?: boolean
  onToggle?: (enabled: boolean) => void
  className?: string
}

interface AnalyticsData {
  personCount: number
  demographics: {
    male: number
    female: number
    unknown: number
  }
  ageGroups: {
    child: number
    teen: number
    adult: number
    senior: number
  }
  emotions: {
    happy: number
    neutral: number
    sad: number
    angry: number
    surprised: number
    unknown: number
  }
  lookingAtScreen: number
  timestamp: string
}

interface CameraConfig {
  deviceId: string
  settings: MediaTrackSettings
}

export function CameraAnalytics({ screenId, enabled = false, onToggle, className }: CameraAnalyticsProps) {
  const [isActive, setIsActive] = useState(enabled)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastAnalytics, setLastAnalytics] = useState<AnalyticsData | null>(null)
  const [cameraConfig, setCameraConfig] = useState<CameraConfig | null>(null)
  const [modelsReady, setModelsReady] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load camera configuration on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem("cameraConfig")
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        setCameraConfig(config)
        console.log("[v0] Loaded camera configuration:", config)
      } catch (err) {
        console.error("[v0] Failed to parse camera config:", err)
      }
    } else {
      console.log("[v0] No camera configuration found in localStorage")
    }
  }, [])

  // Initialize AI models on mount
  useEffect(() => {
    console.log("[v0] Initializing AI models...")
    initializeModels()
      .then(() => {
        console.log("[v0] AI models initialized successfully")
        setModelsReady(true)
      })
      .catch((err) => {
        console.error("[v0] Failed to initialize AI models:", err)
        setError("Failed to initialize AI models. Please refresh the page.")
      })

    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (enabled && !isActive && modelsReady && cameraConfig) {
      console.log("[v0] Analytics enabled, auto-starting camera...")
      startAnalytics()
    } else if (!enabled && isActive) {
      console.log("[v0] Analytics disabled, stopping camera...")
      stopAnalytics()
    }
  }, [enabled, modelsReady, cameraConfig])

  // Request camera permission with stored configuration
  const requestCameraPermission = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: cameraConfig
          ? {
              deviceId: { exact: cameraConfig.deviceId },
              width: { ideal: cameraConfig.settings.width || 640 },
              height: { ideal: cameraConfig.settings.height || 480 },
              frameRate: { ideal: cameraConfig.settings.frameRate || 30 },
            }
          : {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user",
            },
      }

      console.log("[v0] Requesting camera with constraints:", constraints)
      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      streamRef.current = stream
      setHasPermission(true)
      setError("")

      // Log actual camera settings
      const videoTrack = stream.getVideoTracks()[0]
      const actualSettings = videoTrack.getSettings()
      console.log("[v0] Camera started with settings:", actualSettings)

      return true
    } catch (err) {
      console.error("[v0] Camera permission error:", err)
      if (cameraConfig) {
        setError("Configured camera not available. Please check camera setup.")
      } else {
        setError("Camera access denied. Please configure camera in Camera Setup.")
      }
      setHasPermission(false)
      return false
    }
  }, [cameraConfig])

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    setHasPermission(null)
  }, [])

  // Capture frame and send for analysis
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) {
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return
    }

    try {
      setIsProcessing(true)

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      console.log("[v0] Analyzing frame with AI vision...")

      // Analyze frame using AI (client-side processing for privacy)
      const analytics = await analyzeFrame(canvas)

      console.log("[v0] AI analysis complete:", analytics)

      // Send anonymized analytics to backend (no image data)
      const response = await fetch("/api/analytics/process-frame", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          screenId,
          analytics: {
            personCount: analytics.personCount,
            demographics: analytics.demographics,
            ageGroups: analytics.ageGroups,
            emotions: analytics.emotions,
            lookingAtScreen: analytics.lookingAtScreen,
            timestamp: analytics.timestamp,
          },
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`)
      }

      const result = await response.json()
      console.log("[v0] Analytics stored:", result)

      setLastAnalytics(analytics)
    } catch (err) {
      console.error("[v0] Frame analysis error:", err)
      setError(`Analysis failed: ${err instanceof Error ? err.message : "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }, [screenId, isProcessing])

  const startAnalytics = useCallback(async () => {
    console.log("[v0] Starting analytics...")

    // Check if camera is configured
    if (!cameraConfig) {
      const errorMsg = "Camera not configured. Please set up camera first."
      console.error("[v0]", errorMsg)
      setError(errorMsg)
      return
    }

    // Check if models are ready
    if (!modelsReady) {
      const errorMsg = "AI models not ready. Please wait..."
      console.error("[v0]", errorMsg)
      setError(errorMsg)
      return
    }

    // Starting analytics
    const hasCamera = await requestCameraPermission()
    if (hasCamera) {
      setIsActive(true)
      console.log("[v0] Camera started, beginning frame capture every 5 seconds")

      // Start periodic frame capture (every 5 seconds)
      intervalRef.current = setInterval(() => {
        console.log("[v0] Triggering frame capture...")
        captureAndAnalyze()
      }, 5000)

      // Capture first frame immediately
      setTimeout(() => captureAndAnalyze(), 1000)
    }
  }, [cameraConfig, modelsReady, requestCameraPermission, captureAndAnalyze])

  const stopAnalytics = useCallback(() => {
    console.log("[v0] Stopping analytics...")
    stopCamera()
    setIsActive(false)
    setLastAnalytics(null)
  }, [stopCamera])

  // Toggle analytics on/off
  const toggleAnalytics = useCallback(async () => {
    if (!isActive) {
      await startAnalytics()
      onToggle?.(true)
    } else {
      stopAnalytics()
      onToggle?.(false)
    }
  }, [isActive, startAnalytics, stopAnalytics, onToggle])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Audience Analytics
        </CardTitle>
        <div className="flex items-center gap-2">
          {!cameraConfig && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/dashboard/screens/camera-setup", "_blank")}
            >
              <Settings className="h-4 w-4 mr-2" />
              Setup
            </Button>
          )}
          <Button
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={toggleAnalytics}
            disabled={isProcessing || !modelsReady}
          >
            {isActive ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                {modelsReady ? "Start" : "Loading..."}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!modelsReady && <div className="text-xs text-muted-foreground bg-muted p-2 rounded">Loading AI models...</div>}

        {/* Camera configuration status */}
        {cameraConfig && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            Camera: {cameraConfig.settings.width}×{cameraConfig.settings.height} @ {cameraConfig.settings.frameRate}fps
          </div>
        )}

        {isActive && hasPermission && (
          <div className="space-y-4">
            {/* Camera Preview (hidden) */}
            <video ref={videoRef} autoPlay muted playsInline className="hidden" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Analytics Display */}
            {lastAnalytics ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">People Count</div>
                  <div className="text-2xl font-bold text-primary">{lastAnalytics.personCount}</div>
                </div>

                <div>
                  <div className="font-medium">Looking at Screen</div>
                  <div className="text-2xl font-bold text-green-600">{lastAnalytics.lookingAtScreen}</div>
                </div>

                <div className="col-span-2">
                  <div className="font-medium mb-2">Demographics</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>Male: {lastAnalytics.demographics.male}</div>
                    <div>Female: {lastAnalytics.demographics.female}</div>
                    <div>Unknown: {lastAnalytics.demographics.unknown}</div>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="font-medium mb-2">Age Groups</div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>Child: {lastAnalytics.ageGroups.child}</div>
                    <div>Teen: {lastAnalytics.ageGroups.teen}</div>
                    <div>Adult: {lastAnalytics.ageGroups.adult}</div>
                    <div>Senior: {lastAnalytics.ageGroups.senior}</div>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="font-medium mb-2">Emotions</div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>Happy: {lastAnalytics.emotions.happy}</div>
                    <div>Neutral: {lastAnalytics.emotions.neutral}</div>
                    <div>Sad: {lastAnalytics.emotions.sad}</div>
                  </div>
                </div>

                <div className="col-span-2 text-xs text-muted-foreground">
                  Last updated: {new Date(lastAnalytics.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {isProcessing ? "Processing frame..." : "Waiting for analytics data..."}
              </div>
            )}
          </div>
        )}

        {!isActive && (
          <div className="text-center py-8 text-muted-foreground">
            <EyeOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Analytics {enabled ? "starting..." : "disabled"}</p>
            <p className="text-xs">
              {!cameraConfig
                ? "Configure camera first"
                : !modelsReady
                  ? "Loading AI models..."
                  : enabled
                    ? "Initializing camera..."
                    : "Enable analytics to begin"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
