"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Monitor, Wifi } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PlayerSetupPage() {
  const [screenCode, setScreenCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handlePair = async () => {
    if (!screenCode.trim()) {
      setError("Please enter a screen code")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/devices/pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ screenCode: screenCode.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to pair device")
      }

      // Redirect to the player interface with the screen code
      router.push(`/player/${screenCode.trim()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePair()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <Monitor className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Device Player</h1>
            <p className="text-muted-foreground">Enter your screen pairing code to connect this device</p>
          </div>
        </div>

        {/* Pairing Form */}
        <Card className="border-border">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Wifi className="h-5 w-5" />
              Pair Device
            </CardTitle>
            <CardDescription>Enter the pairing code from your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter screen code (e.g., SCR-ABC123)"
                value={screenCode}
                onChange={(e) => setScreenCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                className="text-center text-lg font-mono tracking-wider"
                disabled={isLoading}
              />
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </div>

            <Button onClick={handlePair} disabled={isLoading || !screenCode.trim()} className="w-full" size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Device"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-border bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-3 text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground">How to pair:</h3>
              <ol className="space-y-2 list-decimal list-inside">
                <li>Go to your dashboard and create a new screen</li>
                <li>Copy the generated pairing code</li>
                <li>Enter the code above and click "Connect Device"</li>
                <li>Your content will start displaying automatically</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
