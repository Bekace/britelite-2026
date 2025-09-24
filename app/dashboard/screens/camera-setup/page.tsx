"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import CameraSetup from "@/components/camera-setup"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle } from "lucide-react"

export default function CameraSetupPage() {
  const router = useRouter()
  const [isConfigured, setIsConfigured] = useState(false)
  const [cameraConfig, setCameraConfig] = useState<{
    deviceId: string
    settings: MediaTrackSettings
  } | null>(null)

  const handleCameraConfigured = (deviceId: string, settings: MediaTrackSettings) => {
    setCameraConfig({ deviceId, settings })
    setIsConfigured(true)

    // Store camera configuration in localStorage for the player to use
    localStorage.setItem("cameraConfig", JSON.stringify({ deviceId, settings }))

    console.log("[v0] Camera configuration saved:", { deviceId, settings })
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Camera Hardware Setup</h1>
          <p className="text-muted-foreground">Configure camera hardware for audience analytics</p>
        </div>
      </div>

      {!isConfigured ? (
        <CameraSetup onCameraConfigured={handleCameraConfigured} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Camera Setup Complete
            </CardTitle>
            <CardDescription>Your camera is configured and ready for audience analytics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Resolution:</span>
                <span className="ml-2">
                  {cameraConfig?.settings.width} × {cameraConfig?.settings.height}
                </span>
              </div>
              <div>
                <span className="font-medium">Frame Rate:</span>
                <span className="ml-2">{cameraConfig?.settings.frameRate} fps</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setIsConfigured(false)} variant="outline">
                Reconfigure Camera
              </Button>
              <Button onClick={() => router.push("/dashboard/screens")}>Continue to Screens</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
