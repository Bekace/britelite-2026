"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Smartphone, Tv, CheckCircle, Wifi, RotateCw, ImageIcon, PlayCircle, Calendar, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { transformScreenData } from "@/utils/transformScreenData"

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
  selectedContentIds: string[]
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
  const [editingContentType, setEditingContentType] = useState<"playlist" | "asset">("playlist")

  const [wizardState, setWizardState] = useState<WizardState>({
    step: 1,
    pairingCode: "",
    isPaired: false,
    pairedDevice: null,
    contentType: "",
    selectedContentIds: [],
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
      const response = await fetch(`/api/devices/available`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_code: wizardState.pairingCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Invalid pairing code or device not found",
          variant: "destructive",
        })
        return
      }

      setWizardState((prev) => ({
        ...prev,
        isPaired: true,
        pairedDevice: data.device,
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
      selectedContentIds: [],
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
          content_type: wizardState.selectedContentIds ? wizardState.contentType : "none",
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

      if (wizardState.selectedContentIds) {
        const contentResponse = await fetch(`/api/screens/${screenData.screen.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content_type: wizardState.contentType,
            ...(wizardState.contentType === "playlist"
              ? { playlist_id: wizardState.selectedContentIds }
              : { media_id: wizardState.selectedContentIds }),
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
        selectedContentIds: [],
        contentType: "",
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

  const createScreen = async () => {
    try {
      setIsCreatingScreen(true)

      // Pair device to screen
      const pairResponse = await fetch("/api/devices/pair", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceCode: wizardState.pairedDevice.device_code,
          screenId: "", //TODO: Fix this
        }),
      })

      const pairData = await pairResponse.json()

      if (!pairResponse.ok) {
        throw new Error(pairData.error || "Failed to pair device")
      }

      const screenData = {
        name: wizardState.name,
        location: wizardState.location,
        resolution: wizardState.resolution,
        orientation: wizardState.orientation,
        content_type: wizardState.contentType || "none",
        ...(wizardState.contentType === "playlist" && wizardState.selectedContentIds.length > 0
          ? { playlist_ids: wizardState.selectedContentIds }
          : {}),
        ...(wizardState.contentType === "asset" && wizardState.selectedContentIds.length > 0
          ? { media_ids: wizardState.selectedContentIds }
          : {}),
      }

      const screenResponse = await fetch("/api/screens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(screenData),
      })

      const { screen: createdScreen, error: screenError } = await screenResponse.json()

      if (!screenResponse.ok) {
        throw new Error(screenError || "Failed to create screen")
      }

      if (wizardState.contentType === "playlist" && wizardState.selectedContentIds.length > 0) {
        for (const playlistId of wizardState.selectedContentIds) {
          await fetch(`/api/screens/${createdScreen.id}/playlists`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playlist_id: playlistId, is_active: true }),
          })
        }
      }

      if (wizardState.contentType === "asset" && wizardState.selectedContentIds.length > 0) {
        await fetch(`/api/screens/${createdScreen.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ media_ids: wizardState.selectedContentIds }),
        })
      }

      toast({
        title: "Success",
        description: "Screen created and content assigned successfully!",
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
      setIsCreatingScreen(false)
      setWizardState({
        step: 1,
        pairingCode: "",
        isPaired: false,
        pairedDevice: null,
        contentType: "",
        selectedContentIds: [],
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
      })
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
          onClick={() => setWizardState((prev) => ({ ...prev, contentType: "playlist", selectedContentIds: [] }))}
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
          onClick={() => setWizardState((prev) => ({ ...prev, contentType: "asset", selectedContentIds: [] }))}
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
          onClick={() => setWizardState((prev) => ({ ...prev, contentType: "schedule", selectedContentIds: [] }))}
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
          <p className="text-sm text-gray-600 mb-2">Select one or more playlists:</p>
          {playlists.map((playlist) => (
            <Card
              key={playlist.id}
              className={`cursor-pointer transition-colors ${wizardState.selectedContentIds.includes(playlist.id) ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"}`}
              onClick={() =>
                setWizardState((prev) => {
                  const isSelected = prev.selectedContentIds.includes(playlist.id)
                  return {
                    ...prev,
                    selectedContentIds: isSelected
                      ? prev.selectedContentIds.filter((id) => id !== playlist.id)
                      : [...prev.selectedContentIds, playlist.id],
                  }
                })
              }
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <PlayCircle className="h-6 w-6 text-cyan-500" />
                  <div className="flex-1">
                    <h4 className="font-medium">{playlist.name}</h4>
                  </div>
                  {wizardState.selectedContentIds.includes(playlist.id) && <Check className="h-5 w-5 text-cyan-500" />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {wizardState.contentType === "asset" && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-2">Select one or more media assets:</p>
          {mediaItems.map((media) => (
            <Card
              key={media.id}
              className={`cursor-pointer transition-colors ${wizardState.selectedContentIds.includes(media.id) ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"}`}
              onClick={() =>
                setWizardState((prev) => {
                  const isSelected = prev.selectedContentIds.includes(media.id)
                  return {
                    ...prev,
                    selectedContentIds: isSelected
                      ? prev.selectedContentIds.filter((id) => id !== media.id)
                      : [...prev.selectedContentIds, media.id],
                  }
                })
              }
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <ImageIcon className="h-6 w-6 text-cyan-500" />
                  <div className="flex-1">
                    <h4 className="font-medium">{media.name}</h4>
                    <p className="text-sm text-gray-600">{media.mime_type}</p>
                  </div>
                  {wizardState.selectedContentIds.includes(media.id) && <Check className="h-5 w-5 text-cyan-500" />}
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
        const error = await response.json()
        console.log("[v0] Screen delete error:", error)
        toast({
          title: "Error",
          description: error.error || "Failed to delete screen",
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
}
