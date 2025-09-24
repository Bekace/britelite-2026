"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle, Wifi } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { transformScreenData } from "@/utils/transformScreenData" // Declare the variable before using it

interface Screen {
  id: string
  name: string
  location: string
  resolution: string
  orientation: string
  screen_code: string
  status: "online" | "offline" | "paired" | "unpaired"
  last_seen: string | null
  created_at: string
  playlists?: { id: string; name: string }
  media_id?: string
  analytics_enabled?: boolean
}

interface Playlist {
  id: string
  name: string
}

interface MediaItem {
  id: string
  name: string
  mime_type: string
  file_size: number
}

interface WizardState {
  step: number
  pairingCode: string
  isPaired: boolean
  pairedDevice: any
  contentType: "playlist" | "asset" | "schedule" | ""
  selectedContentId: string
  name: string
  description: string
  location: string
  resolution: "1920x1080" | "3840x2160" | "1366x768" | "1280x720"
  orientation: "landscape" | "portrait" | "rotate-90" | "rotate-180" | "rotate-270"
  advancedOptions: {
    locationEnabled: boolean
    backgroundType: "color" | "image" | "transparent"
    defaultColor: string
    syncPlay: boolean
    showDownloadingStatus: boolean
    preloadAssets: boolean
    showOfflineIndicator: boolean
    mute: boolean
  }
  selectedPlaylist: any
}

export default function ScreensPage() {
  const [screens, setScreens] = useState<Screen[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [repairingScreen, setRepairingScreen] = useState<Screen | null>(null)
  const [newPairingCode, setNewPairingCode] = useState("")
  const [isCreatingScreen, setIsCreatingScreen] = useState(false)

  const [analyticsSettings, setAnalyticsSettings] = useState<{ [key: string]: boolean }>({})

  const [wizardState, setWizardState] = useState<WizardState>({
    step: 1,
    pairingCode: "",
    isPaired: false,
    pairedDevice: null,
    contentType: "",
    selectedContentId: "",
    name: "",
    description: "",
    location: "",
    resolution: "1920x1080",
    orientation: "landscape",
    advancedOptions: {
      locationEnabled: false,
      backgroundType: "color",
      defaultColor: "#000000",
      syncPlay: false,
      showDownloadingStatus: true,
      preloadAssets: false,
      showOfflineIndicator: true,
      mute: false,
    },
    selectedPlaylist: null,
  })

  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchScreens()
    fetchPlaylists()
    fetchMediaItems()
  }, [])

  const fetchScreens = async () => {
    try {
      const response = await fetch("/api/screens")
      if (response.ok) {
        const data = await response.json()
        const transformedScreens = data.screens.map(transformScreenData)
        setScreens(transformedScreens)

        await fetchAnalyticsSettings(transformedScreens)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch screens",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching screens:", error)
      toast({
        title: "Error",
        description: "Failed to fetch screens",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalyticsSettings = async (screens: Screen[]) => {
    try {
      const settings: { [key: string]: boolean } = {}

      for (const screen of screens) {
        console.log("[v0] Fetching analytics settings for screen:", screen.id)
        const response = await fetch(`/api/analytics/settings?screenId=${screen.id}`)
        if (response.ok) {
          const data = await response.json()
          console.log("[v0] Analytics settings response:", data)
          settings[screen.id] = data.enabled || false
        } else {
          console.log("[v0] Failed to fetch analytics settings for screen:", screen.id, response.status)
          settings[screen.id] = false
        }
      }

      console.log("[v0] Final analytics settings:", settings)
      setAnalyticsSettings(settings)
    } catch (error) {
      console.error("Error fetching analytics settings:", error)
    }
  }

  const updateAnalyticsSettings = async (screenId: string, enabled: boolean) => {
    setAnalyticsSettings((prev) => ({
      ...prev,
      [screenId]: enabled,
    }))

    try {
      console.log("[v0] Updating analytics settings:", { screenId, enabled })

      const response = await fetch("/api/analytics/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          screenId,
          enabled,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Analytics settings updated successfully:", data)

        toast({
          title: "Success",
          description: `Analytics ${enabled ? "enabled" : "disabled"} for screen`,
        })
      } else {
        const error = await response.json()
        console.error("[v0] Analytics settings update failed:", error)

        setAnalyticsSettings((prev) => ({
          ...prev,
          [screenId]: !enabled,
        }))

        toast({
          title: "Error",
          description: error.error || "Failed to update analytics settings",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Analytics settings update error:", error)

      setAnalyticsSettings((prev) => ({
        ...prev,
        [screenId]: !enabled,
      }))

      toast({
        title: "Error",
        description: "Failed to update analytics settings",
        variant: "destructive",
      })
    }
  }

  const fetchPlaylists = async () => {
    try {
      const response = await fetch("/api/playlists")
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data.playlists)
      }
    } catch (error) {
      console.error("Error fetching playlists:", error)
    }
  }

  const fetchMediaItems = async () => {
    try {
      const response = await fetch("/api/media/list")
      if (response.ok) {
        const data = await response.json()
        setMediaItems(data.media || [])
      }
    } catch (error) {
      console.error("Error fetching media items:", error)
    }
  }

  const handlePairDevice = async () => {
    if (!wizardState.pairingCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a pairing code",
        variant: "destructive",
      })
      return
    }

    try {
      // Validate the device code exists and is available for pairing
      const response = await fetch(`/api/devices/available`)
      const data = await response.json()

      const availableDevice = data.devices?.find((device: any) => device.device_code === wizardState.pairingCode)

      if (!availableDevice) {
        toast({
          title: "Error",
          description: "Invalid pairing code or device not found",
          variant: "destructive",
        })
        return
      }

      setWizardState((prev) => ({
        ...prev,
        isPaired: true,
        pairedDevice: availableDevice,
      }))

      toast({
        title: "Device Found",
        description: "Device ready for pairing. Continue to complete setup.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate pairing code",
        variant: "destructive",
      })
    }
  }

  const nextStep = () => {
    setWizardState((prev) => ({ ...prev, step: prev.step + 1 }))
  }

  const prevStep = () => {
    setWizardState((prev) => ({ ...prev, step: prev.step - 1 }))
  }

  const resetWizard = () => {
    setWizardState({
      step: 1,
      pairingCode: "",
      isPaired: false,
      pairedDevice: null,
      contentType: "",
      selectedContentId: "",
      name: "",
      description: "",
      location: "",
      resolution: "1920x1080",
      orientation: "landscape",
      advancedOptions: {
        locationEnabled: false,
        backgroundType: "color",
        defaultColor: "#000000",
        syncPlay: false,
        showDownloadingStatus: true,
        preloadAssets: false,
        showOfflineIndicator: true,
        mute: false,
      },
      selectedPlaylist: null,
    })
  }

  const handleCreateScreen = async () => {
    if (!wizardState.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a screen name",
        variant: "destructive",
      })
      return
    }

    if (!wizardState.isPaired || !wizardState.pairedDevice) {
      toast({
        title: "Error",
        description: "Please pair a device first",
        variant: "destructive",
      })
      return
    }

    setCreating(true)

    try {
      // Create the screen first
      const screenResponse = await fetch("/api/screens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: wizardState.name,
          description: wizardState.description,
          location: wizardState.location,
          orientation: wizardState.orientation,
          content_type: wizardState.selectedContentId ? wizardState.contentType : "none",
        }),
      })

      const screenData = await screenResponse.json()

      if (!screenResponse.ok) {
        throw new Error(screenData.error || "Failed to create screen")
      }

      // Pair device to screen
      const pairResponse = await fetch("/api/devices/pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceCode: wizardState.pairedDevice.device_code,
          screenId: screenData.screen.id,
        }),
      })

      const pairData = await pairResponse.json()

      if (!pairResponse.ok) {
        throw new Error(pairData.error || "Failed to pair device")
      }

      if (wizardState.selectedContentId) {
        const contentResponse = await fetch(`/api/screens/${screenData.screen.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content_type: wizardState.contentType,
            ...(wizardState.contentType === "playlist"
              ? { playlist_id: wizardState.selectedContentId }
              : { media_id: wizardState.selectedContentId }),
          }),
        })

        const contentData = await contentResponse.json()

        if (!contentResponse.ok) {
          throw new Error(contentData.error || "Failed to assign content to screen")
        }
      }

      toast({
        title: "Success",
        description: "Screen created and content assigned successfully!",
      })

      // Reset wizard and close modal
      setWizardState({
        step: 1,
        name: "",
        description: "",
        location: "",
        orientation: "landscape",
        pairingCode: "",
        isPaired: false,
        pairedDevice: null,
        selectedPlaylist: null,
        selectedContentId: "",
        contentType: "",
      })
      setIsCreateDialogOpen(false)
      fetchScreens()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create screen",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <Wifi className="h-12 w-12 mx-auto text-cyan-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Connect Your Screen</h3>
        <p className="text-gray-600 mb-6">Enter the pairing code displayed on your device player.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="pairing-code">Device Pairing Code</Label>
          <Input
            id="pairing-code"
            placeholder="Enter code from device (e.g., DEV-ABC123)"
            value={wizardState.pairingCode}
            onChange={(e) => setWizardState((prev) => ({ ...prev, pairingCode: e.target.value.toUpperCase() }))}
            className="font-mono"
          />
        </div>

        {wizardState.isPaired && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">Device Found & Ready</span>
          </div>
        )}

        <Button
          onClick={handlePairDevice}
          disabled={false} // Remove the backslash and ensure proper syntax
        >
          Pair Device
        </Button>
      </div>
    </div>
  )

  // ** rest of code here **
}
