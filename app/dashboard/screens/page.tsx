"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Edit,
  Trash2,
  MapPin,
  Smartphone,
  Tv,
  Copy,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Wifi,
  RotateCw,
  ImageIcon,
  PlayCircle,
  Calendar,
  WifiOff,
  ExternalLink,
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
  contentType: "playlist" | "asset" | "schedule" | ""
  selectedContentId: string
  screenName: string
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
}

export default function ScreensPage() {
  const [screens, setScreens] = useState<Screen[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null)
  const [creating, setCreating] = useState(false)
  const [updating, setUpdating] = useState(false)

  const [wizardState, setWizardState] = useState<WizardState>({
    step: 1,
    pairingCode: "",
    isPaired: false,
    contentType: "",
    selectedContentId: "",
    screenName: "",
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

  const generatePairingCode = () => {
    const code = `SCR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    setWizardState((prev) => ({ ...prev, pairingCode: code }))
  }

  const handlePairDevice = () => {
    if (wizardState.pairingCode.trim()) {
      setWizardState((prev) => ({ ...prev, isPaired: true }))
      toast({
        title: "Device Paired",
        description: "Screen successfully connected to the platform",
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
      contentType: "",
      selectedContentId: "",
      screenName: "",
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
    })
  }

  const handleCreateScreen = async () => {
    setCreating(true)
    try {
      const response = await fetch("/api/screens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: wizardState.screenName,
          location: wizardState.location,
          resolution: wizardState.resolution,
          orientation: wizardState.orientation,
          screen_code: wizardState.pairingCode,
          playlist_id: wizardState.contentType === "playlist" ? wizardState.selectedContentId : null,
          media_id: wizardState.contentType === "asset" ? wizardState.selectedContentId : null,
          advanced_options: wizardState.advancedOptions,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setScreens((prev) => [data.screen, ...prev])
        setShowCreateDialog(false)
        resetWizard()
        toast({
          title: "Success",
          description: "Screen created successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create screen",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Create error:", error)
      toast({
        title: "Error",
        description: "Failed to create screen",
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
        <p className="text-gray-600 mb-6">
          Enter the pairing code from your device player or generate a temporary one for development.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="pairing-code">Pairing Code</Label>
          <div className="flex gap-2">
            <Input
              id="pairing-code"
              placeholder="Enter pairing code"
              value={wizardState.pairingCode}
              onChange={(e) => setWizardState((prev) => ({ ...prev, pairingCode: e.target.value }))}
            />
            <Button variant="outline" onClick={generatePairingCode}>
              Generate
            </Button>
          </div>
        </div>

        {wizardState.isPaired && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-green-800 font-medium">Paired</span>
          </div>
        )}

        <Button
          onClick={handlePairDevice}
          disabled={!wizardState.pairingCode.trim() || wizardState.isPaired}
          className="w-full"
        >
          {wizardState.isPaired ? "Device Connected" : "Connect Device"}
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
            value={wizardState.screenName}
            onChange={(e) => setWizardState((prev) => ({ ...prev, screenName: e.target.value }))}
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
          open={showCreateDialog}
          onOpenChange={(open) => {
            setShowCreateDialog(open)
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
                  onClick={wizardState.step === 1 ? () => setShowCreateDialog(false) : prevStep}
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
                      (wizardState.step === 4 && !wizardState.screenName.trim())
                    }
                  >
                    Next <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleCreateScreen} disabled={creating || !wizardState.screenName.trim()}>
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
              <Button onClick={() => setShowCreateDialog(true)} className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Screen
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScreens.map((screen) => (
            <Card key={screen.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate flex items-center gap-2" title={screen.name}>
                      {getStatusIcon(screen.orientation)}
                      {screen.name}
                    </CardTitle>
                    {screen.location && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        <span>{screen.location}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingScreen(screen)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteScreen(screen.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(screen.status)}>
                      {getStatusIcon(screen.status)}
                      {screen.status.charAt(0).toUpperCase() + screen.status.slice(1)}
                    </Badge>
                    <span className="text-sm text-gray-600">{screen.resolution}</span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Screen Code:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs font-mono"
                        onClick={() => copyToClipboard(screen.screen_code)}
                      >
                        {screen.screen_code}
                        <Copy className="h-3 w-3 ml-1" />
                      </Button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Connection:</span>
                      <span className="text-xs text-gray-800">{getConnectionStatus(screen)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">Last Seen:</span>
                      <span className="text-xs text-gray-800">{formatLastSeen(screen.last_seen)}</span>
                    </div>

                    {screen.status === "online" && (
                      <div className="flex items-center justify-center pt-2">
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          Live
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Content Assignment</span>
                      {screen.playlists && (
                        <Badge variant="outline" className="text-xs">
                          <PlayCircle className="h-3 w-3 mr-1" />
                          Playlist
                        </Badge>
                      )}
                    </div>

                    {screen.playlists ? (
                      <div className="bg-blue-50 p-2 rounded border border-blue-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-800 font-medium">{screen.playlists.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                            onClick={() => {
                              // Navigate to playlist editor
                              window.open(`/dashboard/playlists/${screen.playlists?.id}`, "_blank")
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 p-2 rounded border border-amber-200">
                        <span className="text-sm text-amber-800">No content assigned</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {screen.status === "unpaired" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs bg-transparent"
                        onClick={() => {
                          toast({
                            title: "Pairing Instructions",
                            description: `Share code ${screen.screen_code} with your device to pair`,
                          })
                        }}
                      >
                        <Smartphone className="h-3 w-3 mr-1" />
                        Pair Device
                      </Button>
                    )}

                    {(screen.status === "online" || screen.status === "paired") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs bg-transparent"
                        onClick={() => {
                          // Open player in new tab for testing
                          window.open(`/player/${screen.screen_code}`, "_blank")
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Player
                      </Button>
                    )}

                    <Button variant="outline" size="sm" onClick={() => setEditingScreen(screen)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Screen Dialog */}
      <Dialog open={!!editingScreen} onOpenChange={() => setEditingScreen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Screen</DialogTitle>
            <DialogDescription>Update screen settings and assign playlists.</DialogDescription>
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
                <Label htmlFor="edit-playlist">Assigned Playlist</Label>
                <Select
                  value={editingScreen.playlists?.id || "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setEditingScreen((prev) => prev && { ...prev, playlists: null })
                    } else {
                      const selectedPlaylist = playlists.find((p) => p.id === value)
                      setEditingScreen(
                        (prev) =>
                          prev && {
                            ...prev,
                            playlists: selectedPlaylist || null,
                            playlist_id: value,
                          },
                      )
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a playlist" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No playlist</SelectItem>
                    {playlists.map((playlist) => (
                      <SelectItem key={playlist.id} value={playlist.id}>
                        {playlist.name}
                      </SelectItem>
                    ))}
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
    </div>
  )
}
