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

        <Button onClick={handlePairDevice} disabled={!wizardState.pairingCode.trim()}>
          Pair Device
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Screen Details</h3>
        <p className="text-gray-600 mb-6">Configure your screen settings and display options.</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="screen-name">Screen Name *</Label>
          <Input
            id="screen-name"
            placeholder="e.g., Lobby Display, Conference Room A"
            value={wizardState.name}
            onChange={(e) => setWizardState((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="screen-location">Location</Label>
          <Input
            id="screen-location"
            placeholder="e.g., Main Lobby, Building A"
            value={wizardState.location}
            onChange={(e) => setWizardState((prev) => ({ ...prev, location: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="resolution">Resolution</Label>
            <select
              id="resolution"
              className="w-full p-2 border rounded-md"
              value={wizardState.resolution}
              onChange={(e) => setWizardState((prev) => ({ ...prev, resolution: e.target.value as any }))}
            >
              <option value="1920x1080">1920x1080 (Full HD)</option>
              <option value="3840x2160">3840x2160 (4K)</option>
              <option value="1366x768">1366x768 (HD)</option>
              <option value="1280x720">1280x720 (HD Ready)</option>
            </select>
          </div>

          <div>
            <Label htmlFor="orientation">Orientation</Label>
            <select
              id="orientation"
              className="w-full p-2 border rounded-md"
              value={wizardState.orientation}
              onChange={(e) => setWizardState((prev) => ({ ...prev, orientation: e.target.value as any }))}
            >
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
              <option value="rotate-90">Rotate 90°</option>
              <option value="rotate-180">Rotate 180°</option>
              <option value="rotate-270">Rotate 270°</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Assign Content (Optional)</h3>
        <p className="text-gray-600 mb-6">
          Choose what to display on your screen. You can skip this and assign content later.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Content Type</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button
              variant={wizardState.contentType === "playlist" ? "default" : "outline"}
              onClick={() => setWizardState((prev) => ({ ...prev, contentType: "playlist", selectedContentId: "" }))}
            >
              Playlist
            </Button>
            <Button
              variant={wizardState.contentType === "asset" ? "default" : "outline"}
              onClick={() => setWizardState((prev) => ({ ...prev, contentType: "asset", selectedContentId: "" }))}
            >
              Single Asset
            </Button>
          </div>
        </div>

        {wizardState.contentType === "playlist" && (
          <div>
            <Label>Select Playlist</Label>
            <select
              className="w-full p-2 border rounded-md mt-1"
              value={wizardState.selectedContentId}
              onChange={(e) => setWizardState((prev) => ({ ...prev, selectedContentId: e.target.value }))}
            >
              <option value="">Choose a playlist...</option>
              {playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {wizardState.contentType === "asset" && (
          <div>
            <Label>Select Media Asset</Label>
            <select
              className="w-full p-2 border rounded-md mt-1"
              value={wizardState.selectedContentId}
              onChange={(e) => setWizardState((prev) => ({ ...prev, selectedContentId: e.target.value }))}
            >
              <option value="">Choose an asset...</option>
              {mediaItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-600"
      case "offline":
        return "text-red-600"
      case "paired":
        return "text-blue-600"
      default:
        return "text-gray-600"
    }
  }

  const filteredScreens = screens.filter(
    (screen) =>
      screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screen.location.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading screens...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Screens</h1>
          <p className="text-gray-600">Manage your digital signage displays</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/dashboard/screens/camera-setup")} variant="outline">
            Camera Setup
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>Add Screen</Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search screens..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredScreens.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Wifi className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No screens found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? "No screens match your search criteria." : "Get started by adding your first screen."}
          </p>
          {!searchTerm && <Button onClick={() => setIsCreateDialogOpen(true)}>Add Your First Screen</Button>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredScreens.map((screen) => (
            <div
              key={screen.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{screen.name}</h3>
                  <p className="text-sm text-gray-600">{screen.location}</p>
                </div>
                <span className={`text-sm font-medium ${getStatusColor(screen.status)}`}>{screen.status}</span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div>Resolution: {screen.resolution}</div>
                <div>Orientation: {screen.orientation}</div>
                <div>Code: {screen.screen_code}</div>
                {screen.playlists && <div>Content: {screen.playlists.name}</div>}
              </div>

              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">Analytics</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={analyticsSettings[screen.id] || false}
                    onChange={(e) => updateAnalyticsSettings(screen.id, e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/player/${screen.screen_code}`)}
                  className="flex-1"
                >
                  View Player
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingScreen(screen)} className="flex-1">
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Screen Dialog */}
      {isCreateDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Add New Screen</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsCreateDialogOpen(false)
                    resetWizard()
                  }}
                >
                  ×
                </Button>
              </div>

              {wizardState.step === 1 && renderStep1()}
              {wizardState.step === 2 && renderStep2()}
              {wizardState.step === 3 && renderStep3()}

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={prevStep} disabled={wizardState.step === 1}>
                  Previous
                </Button>

                {wizardState.step < 3 ? (
                  <Button onClick={nextStep} disabled={wizardState.step === 1 && !wizardState.isPaired}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={handleCreateScreen} disabled={creating || !wizardState.name.trim()}>
                    {creating ? "Creating..." : "Create Screen"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
