"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Monitor,
  Plus,
  Search,
  Trash2,
  Smartphone,
  Tv,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Wifi,
  RotateCw,
  ImageIcon,
  PlayCircle,
  Calendar,
  WifiOff,
  Settings,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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
  resolution: string
  orientation: "landscape" | "rotate-90" | "rotate-180" | "rotate-270"
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
          disabled={!wizardState.pairingCode.trim() || wizardState.isPaired}
          className="w-full"
        >
          {wizardState.isPaired ? "Device Ready" : "Find Device"}
        </Button>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Select Content Type</h3>
        <p className="text-gray-600">Choose what type of content this screen will display.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Card
          className={`cursor-pointer transition-colors ${wizardState.contentType === "playlist" ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"}`}
          onClick={() => setWizardState((prev) => ({ ...prev, contentType: "playlist", selectedContentId: "" }))}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <PlayCircle className="h-8 w-8 text-cyan-500" />
              <div>
                <h4 className="font-semibold">Playlist</h4>
                <p className="text-sm text-gray-600">Display a sequence of media items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${wizardState.contentType === "asset" ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"}`}
          onClick={() => setWizardState((prev) => ({ ...prev, contentType: "asset", selectedContentId: "" }))}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ImageIcon className="h-8 w-8 text-cyan-500" />
              <div>
                <h4 className="font-semibold">Asset</h4>
                <p className="text-sm text-gray-600">Display a single media item</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors opacity-50 ${wizardState.contentType === "schedule" ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"}`}
          onClick={() => setWizardState((prev) => ({ ...prev, contentType: "schedule", selectedContentId: "" }))}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-gray-400" />
              <div>
                <h4 className="font-semibold text-gray-400">Schedule</h4>
                <p className="text-sm text-gray-400">Time-based content scheduling (Coming Soon)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Select Content</h3>
        <p className="text-gray-600">Choose the {wizardState.contentType} to display on this screen.</p>
      </div>

      {wizardState.contentType === "playlist" && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {playlists.map((playlist) => (
            <Card
              key={playlist.id}
              className={`cursor-pointer transition-colors ${wizardState.selectedContentId === playlist.id ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"}`}
              onClick={() => setWizardState((prev) => ({ ...prev, selectedContentId: playlist.id }))}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <PlayCircle className="h-6 w-6 text-cyan-500" />
                  <div>
                    <h4 className="font-medium">{playlist.name}</h4>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {wizardState.contentType === "asset" && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {mediaItems.map((media) => (
            <Card
              key={media.id}
              className={`cursor-pointer transition-colors ${wizardState.selectedContentId === media.id ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"}`}
              onClick={() => setWizardState((prev) => ({ ...prev, selectedContentId: media.id }))}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <ImageIcon className="h-6 w-6 text-cyan-500" />
                  <div>
                    <h4 className="font-medium">{media.name}</h4>
                    <p className="text-sm text-gray-600">{media.mime_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {wizardState.contentType === "schedule" && (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Schedule functionality will be available soon.</p>
        </div>
      )}
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <RotateCw className="h-12 w-12 mx-auto text-cyan-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Screen Orientation</h3>
        <p className="text-gray-600">Select how the content should be oriented on your screen.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { value: "landscape", label: "Landscape", icon: Tv },
          { value: "rotate-90", label: "Rotate 90°", icon: Smartphone },
          { value: "rotate-180", label: "Rotate 180°", icon: Tv },
          { value: "rotate-270", label: "Rotate 270°", icon: Smartphone },
        ].map(({ value, label, icon: Icon }) => (
          <Card
            key={value}
            className={`cursor-pointer transition-colors ${wizardState.orientation === value ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"}`}
            onClick={() => setWizardState((prev) => ({ ...prev, orientation: value as any }))}
          >
            <CardContent className="p-4 text-center">
              <Icon className="h-8 w-8 mx-auto text-cyan-500 mb-2" />
              <h4 className="font-medium">{label}</h4>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4 pt-4">
        <div>
          <Label htmlFor="screen-name">Screen Name</Label>
          <Input
            id="screen-name"
            placeholder="Enter screen name"
            value={wizardState.name}
            onChange={(e) => setWizardState((prev) => ({ ...prev, name: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="screen-description">Description (Optional)</Label>
          <Input
            id="screen-description"
            placeholder="Enter description"
            value={wizardState.description}
            onChange={(e) => setWizardState((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="screen-location">Location (Optional)</Label>
          <Input
            id="screen-location"
            placeholder="Enter location"
            value={wizardState.location}
            onChange={(e) => setWizardState((prev) => ({ ...prev, location: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="screen-resolution">Resolution</Label>
          <Select
            value={wizardState.resolution}
            onValueChange={(value) => setWizardState((prev) => ({ ...prev, resolution: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
              <SelectItem value="3840x2160">3840x2160 (4K)</SelectItem>
              <SelectItem value="1366x768">1366x768 (HD)</SelectItem>
              <SelectItem value="1280x720">1280x720 (HD Ready)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold mb-2">Advanced Options</h3>
        <p className="text-gray-600">Configure additional settings for your screen.</p>
      </div>

      <div className="space-y-4 max-h-64 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <Label>Location Services</Label>
            <p className="text-sm text-gray-600">Enable location-based features</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.locationEnabled}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, locationEnabled: checked },
              }))
            }
          />
        </div>

        <div>
          <Label>Background Type</Label>
          <Select
            value={wizardState.advancedOptions.backgroundType}
            onValueChange={(value: "color" | "image" | "transparent") =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, backgroundType: value },
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="color">Solid Color</SelectItem>
              <SelectItem value="image">Background Image</SelectItem>
              <SelectItem value="transparent">Transparent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {wizardState.advancedOptions.backgroundType === "color" && (
          <div>
            <Label>Default Color</Label>
            <Input
              type="color"
              value={wizardState.advancedOptions.defaultColor}
              onChange={(e) =>
                setWizardState((prev) => ({
                  ...prev,
                  advancedOptions: { ...prev.advancedOptions, defaultColor: e.target.value },
                }))
              }
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label>Sync Play</Label>
            <p className="text-sm text-gray-600">Synchronize playback across screens</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.syncPlay}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, syncPlay: checked },
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Show Downloading Status</Label>
            <p className="text-sm text-gray-600">Display download progress</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.showDownloadingStatus}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, showDownloadingStatus: checked },
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Preload Assets in Playlist</Label>
            <p className="text-sm text-gray-600">Cache content for smoother playback</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.preloadAssets}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, preloadAssets: checked },
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Show Offline Indicator</Label>
            <p className="text-sm text-gray-600">Display connection status</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.showOfflineIndicator}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, showOfflineIndicator: checked },
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Mute</Label>
            <p className="text-sm text-gray-600">Disable audio playback</p>
          </div>
          <Switch
            checked={wizardState.advancedOptions.mute}
            onCheckedChange={(checked) =>
              setWizardState((prev) => ({
                ...prev,
                advancedOptions: { ...prev.advancedOptions, mute: checked },
              }))
            }
          />
        </div>
      </div>
    </div>
  )

  const handleUpdateScreen = async () => {
    if (!editingScreen) return

    setUpdating(true)
    try {
      console.log("[v0] Updating screen with data:", editingScreen)

      const response = await fetch(`/api/screens/${editingScreen.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingScreen),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Screen update response:", data)
        const transformedScreen = transformScreenData(data.screen)
        setScreens((prev) => prev.map((screen) => (screen.id === editingScreen.id ? transformedScreen : screen)))
        setEditingScreen(null)
        toast({
          title: "Success",
          description: "Screen updated successfully",
        })
      } else {
        const error = await response.json()
        console.log("[v0] Screen update error:", error)
        toast({
          title: "Error",
          description: error.error || "Failed to update screen",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Update error:", error)
      toast({
        title: "Error",
        description: "Failed to update screen",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteScreen = async (id: string) => {
    try {
      const response = await fetch(`/api/screens/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setScreens((prev) => prev.filter((screen) => screen.id !== id))
        toast({
          title: "Success",
          description: "Screen deleted successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete screen",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete screen",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy text",
        variant: "destructive",
      })
    }
  }

  const handleRepairScreen = async (screen: Screen) => {
    if (!newPairingCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a pairing code",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch(`/api/devices/pair`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceCode: newPairingCode,
          screenId: screen.id,
        }),
      })

      if (response.ok) {
        // Refresh screens to show updated connection status
        await fetchScreens()
        setRepairingScreen(null)
        setNewPairingCode("")
        toast({
          title: "Success",
          description: "Device re-paired successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to pair device",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to pair device",
        variant: "destructive",
      })
    }
  }

  const filteredScreens = screens.filter(
    (screen) =>
      screen.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      screen.location.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800 border-green-200"
      case "paired":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "offline":
        return "bg-red-100 text-red-800 border-red-200"
      case "unpaired":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <Wifi className="h-3 w-3 mr-1 text-green-600" />
      case "paired":
        return <CheckCircle className="h-3 w-3 mr-1 text-blue-600" />
      case "offline":
        return <WifiOff className="h-3 w-3 mr-1 text-red-600" />
      case "unpaired":
        return <Monitor className="h-3 w-3 mr-1 text-gray-600" />
      default:
        return <Monitor className="h-3 w-3 mr-1 text-gray-600" />
    }
  }

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "Never"

    const now = new Date()
    const lastSeenDate = new Date(lastSeen)
    const diffInMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getConnectionStatus = (screen: Screen) => {
    if (screen.status === "online") {
      return "Device connected and active"
    } else if (screen.status === "paired") {
      return "Device paired but not active"
    } else if (screen.status === "offline") {
      return "Device disconnected"
    } else {
      return "Waiting for device pairing"
    }
  }

  // Helper function to transform screen data structure
  const transformScreenData = (screen: any): Screen => {
    // Extract active playlist from screen_playlists array
    const activePlaylist = screen.screen_playlists?.find((sp: any) => sp.is_active)?.playlists

    return {
      ...screen,
      playlists: activePlaylist || null,
      playlist_id: activePlaylist?.id || null,
      media_id: screen.media_id || null,
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Screens</h1>
          <p className="text-gray-600 mt-1">Manage your digital signage displays</p>
        </div>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) resetWizard()
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Screen
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Screen - Step {wizardState.step} of 5</DialogTitle>
              <DialogDescription>
                {wizardState.step === 1 && "Connect your device to the platform"}
                {wizardState.step === 2 && "Choose the type of content to display"}
                {wizardState.step === 3 && "Select specific content for your screen"}
                {wizardState.step === 4 && "Configure screen orientation and details"}
                {wizardState.step === 5 && "Set up advanced display options"}
              </DialogDescription>
            </DialogHeader>

            {wizardState.step === 1 && renderStep1()}
            {wizardState.step === 2 && renderStep2()}
            {wizardState.step === 3 && renderStep3()}
            {wizardState.step === 4 && renderStep4()}
            {wizardState.step === 5 && renderStep5()}

            <DialogFooter>
              <div className="flex justify-between w-full">
                <Button
                  variant="outline"
                  onClick={wizardState.step === 1 ? () => setIsCreateDialogOpen(false) : prevStep}
                >
                  {wizardState.step === 1 ? (
                    "Cancel"
                  ) : (
                    <>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </>
                  )}
                </Button>

                {wizardState.step < 5 ? (
                  <Button
                    onClick={nextStep}
                    disabled={
                      (wizardState.step === 1 && !wizardState.isPaired) ||
                      (wizardState.step === 2 && !wizardState.contentType) ||
                      (wizardState.step === 3 &&
                        !wizardState.selectedContentId &&
                        wizardState.contentType !== "schedule") ||
                      (wizardState.step === 4 && !wizardState.name.trim())
                    }
                  >
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleCreateScreen} disabled={creating || !wizardState.name.trim()}>
                    {creating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : null}
                    Create Screen
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search screens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredScreens.length} of {screens.length} screens
        </div>
      </div>

      {/* Screens Grid */}
      {filteredScreens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Monitor className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No screens found</h3>
            <p className="text-gray-600 text-center mb-4">
              {screens.length === 0
                ? "Add your first screen to start managing your digital signage displays"
                : "No screens match your search criteria"}
            </p>
            {screens.length === 0 && (
              <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Screen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScreens.map((screen) => (
            <Card key={screen.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4" />
                    <h3 className="font-semibold">{screen.name}</h3>
                    <Badge variant={screen.status === "online" ? "default" : "secondary"}>
                      {screen.status === "online" ? "Online" : "Offline"}
                    </Badge>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      Screen Code: <code className="bg-gray-100 px-1 rounded">{screen.screen_code}</code>
                    </div>
                    <div>Connection: {screen.last_seen === "Never" ? "Device disconnected" : "Device connected"}</div>
                    <div>Last Seen: {screen.last_seen}</div>
                  </div>

                  <div className="mt-3">
                    <div className="text-sm font-medium mb-1">Content Assignment</div>
                    {screen.playlists ? (
                      <div className="bg-green-50 border border-green-200 rounded p-2 text-sm">
                        Playlist: {screen.playlists.name}
                      </div>
                    ) : screen.media_id ? (
                      <div className="bg-green-50 border border-green-200 rounded p-2 text-sm">
                        Asset: {mediaItems.find((media) => media.id === screen.media_id)?.name}
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 rounded p-2 text-sm text-amber-800">
                        No content assigned
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {screen.last_seen === "Never" && (
                    <Button variant="outline" size="sm" onClick={() => setRepairingScreen(screen)}>
                      <Wifi className="h-4 w-4 mr-1" />
                      Re-pair
                    </Button>
                  )}

                  <Button variant="outline" size="sm" onClick={() => setEditingScreen(screen)}>
                    <Settings className="h-4 w-4" />
                  </Button>

                  <Button variant="outline" size="sm" onClick={() => handleDeleteScreen(screen.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Screen Dialog */}
      <Dialog open={!!editingScreen} onOpenChange={() => setEditingScreen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Screen</DialogTitle>
            <DialogDescription>Update screen settings and assign content.</DialogDescription>
          </DialogHeader>
          {editingScreen && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Screen Name</Label>
                <Input
                  id="edit-name"
                  value={editingScreen.name}
                  onChange={(e) => setEditingScreen((prev) => prev && { ...prev, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editingScreen.location}
                  onChange={(e) => setEditingScreen((prev) => prev && { ...prev, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-content">Assigned Content</Label>
                <Select
                  value={editingScreen.playlists?.id || editingScreen.media_id || "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setEditingScreen(
                        (prev) =>
                          prev && {
                            ...prev,
                            playlists: null,
                            media_id: null,
                            playlist_id: null,
                          },
                      )
                    } else {
                      // Check if it's a playlist or media item
                      const selectedPlaylist = playlists.find((p) => p.id === value)
                      const selectedMedia = mediaItems.find((m) => m.id === value)

                      if (selectedPlaylist) {
                        setEditingScreen(
                          (prev) =>
                            prev && {
                              ...prev,
                              playlists: selectedPlaylist,
                              playlist_id: value,
                              media_id: null,
                            },
                        )
                      } else if (selectedMedia) {
                        setEditingScreen(
                          (prev) =>
                            prev && {
                              ...prev,
                              playlists: null,
                              playlist_id: null,
                              media_id: value,
                            },
                        )
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No content</SelectItem>

                    {playlists.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-semibold text-gray-500">Playlists</div>
                        {playlists.map((playlist) => (
                          <SelectItem key={`playlist-${playlist.id}`} value={playlist.id}>
                            <div className="flex items-center gap-2">
                              <PlayCircle className="h-4 w-4" />
                              {playlist.name}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}

                    {mediaItems.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-sm font-semibold text-gray-500">Media Assets</div>
                        {mediaItems.map((media) => (
                          <SelectItem key={`media-${media.id}`} value={media.id}>
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4" />
                              {media.name}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-resolution">Resolution</Label>
                  <Select
                    value={editingScreen.resolution}
                    onValueChange={(value) => setEditingScreen((prev) => prev && { ...prev, resolution: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                      <SelectItem value="3840x2160">3840x2160 (4K)</SelectItem>
                      <SelectItem value="1366x768">1366x768 (HD)</SelectItem>
                      <SelectItem value="1280x720">1280x720 (HD Ready)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-orientation">Orientation</Label>
                  <Select
                    value={editingScreen.orientation}
                    onValueChange={(value) => setEditingScreen((prev) => prev && { ...prev, orientation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape">Landscape</SelectItem>
                      <SelectItem value="portrait">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingScreen(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateScreen} disabled={updating}>
              {updating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : null}
              Update Screen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-pairing Dialog */}
      <Dialog open={!!repairingScreen} onOpenChange={() => setRepairingScreen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Re-pair Device</DialogTitle>
            <DialogDescription>
              Enter the pairing code from your new device to connect it to "{repairingScreen?.name}".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="new-pairing-code">Device Pairing Code</Label>
              <Input
                id="new-pairing-code"
                placeholder="Enter code from device (e.g., DEV-ABC123)"
                value={newPairingCode}
                onChange={(e) => setNewPairingCode(e.target.value.toUpperCase())}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRepairingScreen(null)}>
              Cancel
            </Button>
            <Button onClick={() => handleRepairScreen(repairingScreen!)}>Pair Device</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
