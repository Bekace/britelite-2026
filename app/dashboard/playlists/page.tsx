"use client"

import type React from "react"

import { DialogFooter } from "@/components/ui/dialog"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  PlayCircle,
  Plus,
  Search,
  Trash2,
  ImageIcon,
  Video,
  Eye,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Settings,
  FileText,
  GripVertical,
  Edit,
  SkipBack,
  Volume2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Playlist {
  id: string
  name: string
  description: string
  created_at: string
  playlist_media: { count: number }[]
}

interface PlaylistItem {
  id: string
  position: number
  duration_override: number
  media: {
    id: string
    name: string
    file_path: string
    mime_type: string
    file_size: number
  }
  start_time?: number
  end_time?: number
  notes?: string
  transition_type?: "fade" | "slide-left" | "slide-right" | "cross-fade" | "zoom"
  transition_duration?: number
}

interface Media {
  id: string
  name: string
  file_path: string
  mime_type: string
  file_size: number
  created_at: string
}

interface PlaylistPreviewProps {
  playlist: Playlist | null
  isOpen: boolean
  onClose: () => void
}

function PlaylistPreviewModal({ playlist, isOpen, onClose }: PlaylistPreviewProps) {
  const [items, setItems] = useState<PlaylistItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoLoop, setAutoLoop] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (isOpen && playlist) {
      console.log("[v0] Fetching items for playlist:", playlist.name)
      fetchPlaylistItems()
    } else {
      setCurrentIndex(0)
      setIsPlaying(false)
      setTimeRemaining(0)
      setItems([])
      setIsFullscreen(false)
    }
  }, [isOpen, playlist])

  useEffect(() => {
    if (items.length > 0 && !isPlaying) {
      console.log("[v0] Auto-starting playlist playback")
      setIsPlaying(true)
    }
  }, [items])

  useEffect(() => {
    if (!isPlaying || timeRemaining <= 0 || items.length === 0) return

    const timer = setTimeout(() => {
      if (timeRemaining > 1) {
        setTimeRemaining(timeRemaining - 1)
      } else {
        const nextIndex = currentIndex + 1
        if (nextIndex < items.length) {
          setCurrentIndex(nextIndex)
          setTimeRemaining(items[nextIndex].duration_override || 10)
        } else {
          if (autoLoop) {
            setCurrentIndex(0)
            setTimeRemaining(items[0]?.duration_override || 10)
          } else {
            setIsPlaying(false)
            setCurrentIndex(0)
            setTimeRemaining(items[0]?.duration_override || 10)
          }
        }
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [isPlaying, timeRemaining, currentIndex, items, autoLoop])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.code) {
        case "Space":
          e.preventDefault()
          isPlaying ? handlePause() : handlePlay()
          break
        case "ArrowRight":
          e.preventDefault()
          handleNext()
          break
        case "ArrowLeft":
          e.preventDefault()
          handlePrevious()
          break
        case "KeyF":
          e.preventDefault()
          toggleFullscreen()
          break
        case "Escape":
          if (isFullscreen) {
            setIsFullscreen(false)
          }
          break
      }
    }

    document.addEventListener("keydown", handleKeyPress)
    return () => document.removeEventListener("keydown", handleKeyPress)
  }, [isOpen, isPlaying, isFullscreen])

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play()
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, currentIndex])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
      videoRef.current.playbackRate = playbackSpeed
    }
  }, [volume, playbackSpeed])

  const fetchPlaylistItems = async () => {
    if (!playlist) {
      console.log("[v0] Cannot fetch items: playlist is null")
      return
    }

    setLoading(true)
    try {
      console.log("[v0] Fetching playlist items for ID:", playlist.id)
      const response = await fetch(`/api/playlists/${playlist.id}`)
      if (response.ok) {
        const data = await response.json()
        const sortedItems =
          data.playlist.playlist_items?.sort((a: PlaylistItem, b: PlaylistItem) => a.position - b.position) || []
        console.log("[v0] Loaded playlist items:", sortedItems.length)
        setItems(sortedItems)
        setCurrentIndex(0)
        setTimeRemaining(sortedItems[0]?.duration_override || 10)
      }
    } catch (error) {
      console.error("Error fetching playlist items:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = () => {
    if (items.length === 0) return
    setIsPlaying(true)
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setTimeRemaining(items[nextIndex].duration_override || 10)
    } else if (autoLoop) {
      setCurrentIndex(0)
      setTimeRemaining(items[0]?.duration_override || 10)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      setCurrentIndex(prevIndex)
      setTimeRemaining(items[prevIndex].duration_override || 10)
    } else if (autoLoop) {
      const lastIndex = items.length - 1
      setCurrentIndex(lastIndex)
      setTimeRemaining(items[lastIndex]?.duration_override || 10)
    }
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentIndex(0)
    setTimeRemaining(items[0]?.duration_override || 10)
  }

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  const getTransitionTransform = () => {
    if (!isTransitioning) return "none"

    switch ((items[currentIndex] as any)?.transition_type) {
      case "slide":
        return "translateX(100%)"
      case "zoom":
        return "scale(0.8)"
      case "crossfade":
      case "fade":
      default:
        return "none"
    }
  }

  const renderMedia = () => {
    if (!items.length || currentIndex >= items.length) return null

    const item = items[currentIndex]
    const mediaStyle = {
      transition: `all ${item.transition_duration}s ease-in-out`,
      opacity: isTransitioning ? 0 : 1,
      transform: getTransitionTransform(),
    }

    if (item.media.mime_type?.startsWith("image/")) {
      return (
        <img
          src={item.media.file_path || "/placeholder.svg"}
          alt={item.media.name}
          className="w-full h-full object-contain"
          style={{ ...mediaStyle, pointerEvents: "none" }}
        />
      )
    }

    if (item.media.mime_type?.startsWith("video/")) {
      return (
        <video
          ref={videoRef}
          src={item.media.file_path}
          className="w-full h-full object-contain"
          playsInline
          style={mediaStyle}
          onEnded={() => {
            // Auto-advance when video ends
            if (currentIndex < items.length - 1) {
              handleNext()
            } else if (autoLoop) {
              setCurrentIndex(0)
              setTimeRemaining(items[0]?.duration_override || 10)
            } else {
              setIsPlaying(false)
            }
          }}
        />
      )
    }

    if (item.media.mime_type === "application/vnd.google-apps.presentation") {
      const embedUrl = item.media.file_path.includes("/edit")
        ? item.media.file_path.replace("/edit", "/embed")
        : `${item.media.file_path}/embed`

      return (
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          title={item.media.name}
          style={{ ...mediaStyle, pointerEvents: "none" }}
        />
      )
    }

    return (
      <div className="flex items-center justify-center h-full bg-gray-100" style={mediaStyle}>
        <div className="text-center">
          <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Unsupported media type</p>
        </div>
      </div>
    )
  }

  const currentItem = items[currentIndex]

  if (!playlist) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        ref={containerRef}
        className={`max-w-6xl p-0 ${isFullscreen ? "fixed inset-0 max-w-none h-screen" : ""}`}
        style={{ height: isFullscreen ? "100vh" : "calc(100vh - 100px)" }}
      >
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{playlist.name} Preview</DialogTitle>
          <DialogDescription>
            {items.length > 0 ? `${currentIndex + 1} of ${items.length} items` : "Loading..."}
            {isPlaying && <span className="ml-2 text-green-600">● Auto-playing</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 relative bg-black overflow-hidden">{renderMedia()}</div>

        <div className="p-6 pt-4 border-t bg-gray-50">
          <div className="space-y-4">
            {/* Main playback controls */}
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
              </Button>

              <Button variant="outline" size="sm" onClick={handlePrevious} disabled={currentIndex === 0 && !autoLoop}>
                <SkipBack className="h-4 w-4" />
              </Button>

              {isPlaying ? (
                <Button onClick={handlePause} className="bg-cyan-500 hover:bg-cyan-600">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button onClick={handlePlay} disabled={items.length === 0} className="bg-cyan-500 hover:bg-cyan-600">
                  <Play className="h-4 w-4 mr-2" />
                  Play
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={currentIndex >= items.length - 1 && !autoLoop}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Additional controls */}
            <div className="flex items-center justify-center gap-6 text-sm">
              {/* Volume control */}
              {currentItem?.media.mime_type?.startsWith("video/") && (
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
                    className="w-20"
                  />
                </div>
              )}

              {/* Speed control */}
              <div className="flex items-center gap-2">
                <span>Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number.parseFloat(e.target.value))}
                  className="px-2 py-1 border rounded"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>

              {/* Auto-loop toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoLoop"
                  checked={autoLoop}
                  onChange={(e) => setAutoLoop(e.target.checked)}
                />
                <label htmlFor="autoLoop">Auto-loop</label>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600 mt-2">
            <p>Keyboard shortcuts: Space (play/pause), ← → (navigate), F (fullscreen)</p>
          </div>
        </div>

        <div className="p-4 bg-gray-900 border-t border-gray-700">
          <div className="flex items-center justify-between mb-4">{/* ... existing playback controls ... */}</div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <label className="text-gray-300">Auto Loop:</label>
              <input
                type="checkbox"
                checked={autoLoop}
                onChange={(e) => setAutoLoop(e.target.checked)}
                className="rounded"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPlaylist, setNewPlaylist] = useState({ name: "", description: "" })
  const [creating, setCreating] = useState(false)
  const [previewPlaylist, setPreviewPlaylist] = useState<Playlist | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([])
  const [availableMedia, setAvailableMedia] = useState<Media[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    duration_override: 10,
    start_time: 0,
    end_time: 0,
    notes: "",
    position: 1,
    transition_type: "fade" as "fade" | "slide-left" | "slide-right" | "cross-fade" | "zoom",
    transition_duration: 0.8,
  })
  const [updating, setUpdating] = useState(false)
  const [draggedItem, setDraggedItem] = useState<PlaylistItem | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const [transitionType, setTransitionType] = useState<"fade" | "slide-left" | "slide-right" | "cross-fade" | "zoom">(
    "fade",
  )
  const [transitionDuration, setTransitionDuration] = useState(0.8)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [autoLoop, setAutoLoop] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [volume, setVolume] = useState(1)
  const [timeRemaining, setTimeRemaining] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { toast } = useToast()

  useEffect(() => {
    fetchPlaylists()
    fetchAvailableMedia()
  }, [])

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistItems(selectedPlaylist.id)
    }
  }, [selectedPlaylist])

  const fetchPlaylists = async () => {
    try {
      const response = await fetch("/api/playlists")
      if (response.ok) {
        const data = await response.json()
        setPlaylists(data.playlists)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch playlists",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching playlists:", error)
      toast({
        title: "Error",
        description: "Failed to fetch playlists",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPlaylistItems = async (playlistId: string) => {
    setLoadingItems(true)
    try {
      const response = await fetch(`/api/playlists/${playlistId}`)
      if (response.ok) {
        const data = await response.json()
        const sortedItems =
          data.playlist.playlist_items?.sort((a: PlaylistItem, b: PlaylistItem) => a.position - b.position) || []
        setPlaylistItems(sortedItems)
      }
    } catch (error) {
      console.error("Error fetching playlist items:", error)
    } finally {
      setLoadingItems(false)
    }
  }

  const fetchAvailableMedia = async () => {
    setLoadingMedia(true)
    try {
      const response = await fetch("/api/media/list")
      if (response.ok) {
        const data = await response.json()
        setAvailableMedia(data.media || [])
      }
    } catch (error) {
      console.error("Error fetching media:", error)
    } finally {
      setLoadingMedia(false)
    }
  }

  const handleAddMediaToPlaylist = async (mediaId: string) => {
    if (!selectedPlaylist) return

    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_id: mediaId,
          duration: 10,
        }),
      })

      if (response.ok) {
        fetchPlaylistItems(selectedPlaylist.id)
        toast({
          title: "Success",
          description: "Media added to playlist",
        })
      }
    } catch (error) {
      console.error("Error adding media:", error)
      toast({
        title: "Error",
        description: "Failed to add media to playlist",
        variant: "destructive",
      })
    }
  }

  const handleRemoveFromPlaylist = async (itemId: string) => {
    if (!selectedPlaylist) return

    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}/media`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_item_id: itemId,
        }),
      })

      if (response.ok) {
        fetchPlaylistItems(selectedPlaylist.id)
        toast({
          title: "Success",
          description: "Item removed from playlist",
        })
      }
    } catch (error) {
      console.error("Error removing item:", error)
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      })
    }
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylist.name.trim()) return

    setCreating(true)
    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPlaylist),
      })

      if (response.ok) {
        const data = await response.json()
        const newPlaylistData = { ...data.playlist, playlist_media: [{ count: 0 }] }
        setPlaylists((prev) => [newPlaylistData, ...prev])
        setNewPlaylist({ name: "", description: "" })
        setShowCreateDialog(false)
        setSelectedPlaylist(newPlaylistData)
        toast({
          title: "Success",
          description: "Playlist created successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create playlist",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Create error:", error)
      toast({
        title: "Error",
        description: "Failed to create playlist",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePlaylist = async (id: string) => {
    try {
      const response = await fetch(`/api/playlists/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setPlaylists((prev) => prev.filter((playlist) => playlist.id !== id))
        if (selectedPlaylist?.id === id) {
          setSelectedPlaylist(null)
          setPlaylistItems([])
        }
        toast({
          title: "Success",
          description: "Playlist deleted successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete playlist",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete playlist",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateItem = async () => {
    if (!editingItem || !selectedPlaylist) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}/media`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlist_item_id: editingItem.id,
          duration_override: editForm.duration_override,
          start_time: editForm.start_time,
          end_time: editForm.end_time,
          notes: editForm.notes,
          transition_type: editForm.transition_type,
          transition_duration: editForm.transition_duration,
        }),
      })

      if (!response.ok) throw new Error("Failed to update item")

      setPlaylistItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                duration_override: editForm.duration_override,
                start_time: editForm.start_time,
                end_time: editForm.end_time,
                notes: editForm.notes,
                transition_type: editForm.transition_type,
                transition_duration: editForm.transition_duration,
              }
            : item,
        ),
      )

      setShowEditDialog(false)
      setEditingItem(null)
      toast({ title: "Item updated successfully" })
    } catch (error) {
      console.error("Error updating item:", error)
      toast({ title: "Failed to update item", variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  const handleDragStart = (e: React.DragEvent, item: PlaylistItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (!draggedItem || !selectedPlaylist) return

    const currentItems = [...playlistItems]
    const draggedIndex = currentItems.findIndex((item) => item.id === draggedItem.id)

    if (draggedIndex === dropIndex) return

    // Remove dragged item and insert at new position
    const [removed] = currentItems.splice(draggedIndex, 1)
    currentItems.splice(dropIndex, 0, removed)

    // Update positions
    const updatedItems = currentItems.map((item, index) => ({
      ...item,
      position: index + 1,
    }))

    // Optimistic update
    setPlaylistItems(updatedItems)

    // Update positions in database
    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}/reorder`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: updatedItems.map((item) => ({
            id: item.id,
            position: item.position,
          })),
        }),
      })

      if (!response.ok) {
        // Revert on error
        fetchPlaylistItems(selectedPlaylist.id)
        toast({
          title: "Error",
          description: "Failed to reorder items",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error reordering items:", error)
      fetchPlaylistItems(selectedPlaylist.id)
      toast({
        title: "Error",
        description: "Failed to reorder items",
      })
    }

    setDraggedItem(null)
  }

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handlePreviewPlaylist = (playlist: Playlist) => {
    console.log("[v0] Opening preview for playlist:", playlist.name)
    setShowCreateDialog(false)
    setPreviewPlaylist(playlist)
  }

  const handleOpenCreateDialog = () => {
    setPreviewPlaylist(null)
    setShowCreateDialog(true)
  }

  const handleEditItem = (item: PlaylistItem) => {
    setEditingItem(item)
    setEditForm({
      name: item.media.name,
      duration_override: item.duration_override || 10,
      start_time: item.start_time || 0,
      end_time: item.end_time || 0,
      notes: item.notes || "",
      position: item.position,
      transition_type: (item as any).transition_type || "fade",
      transition_duration: (item as any).transition_duration || 0.8,
    })
    setShowEditDialog(true)
  }

  const renderMedia = () => {
    if (!playlistItems.length || currentIndex >= playlistItems.length) return null

    const item = playlistItems[currentIndex]
    const isImage = item.media.file_path?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    const isVideo = item.media.file_path?.match(/\.(mp4|webm|ogg|mov)$/i)
    const isGoogleSlides = item.media.file_path?.includes("docs.google.com/presentation")

    const transitionClasses = {
      fade: "transition-opacity duration-800 ease-in-out",
      "slide-left": "transition-transform duration-800 ease-in-out",
      "slide-right": "transition-transform duration-800 ease-in-out",
      "cross-fade": "transition-all duration-1000 ease-in-out",
      zoom: "transition-all duration-800 ease-in-out",
    }

    const getTransitionStyle = () => {
      const baseStyle = {
        transitionDuration: `${transitionDuration}s`,
      }

      if (isTransitioning) {
        switch (transitionType) {
          case "fade":
            return { ...baseStyle, opacity: 0 }
          case "slide-left":
            return { ...baseStyle, transform: "translateX(-100%)" }
          case "slide-right":
            return { ...baseStyle, transform: "translateX(100%)" }
          case "cross-fade":
            return { ...baseStyle, opacity: 0, transform: "scale(0.95)" }
          case "zoom":
            return { ...baseStyle, opacity: 0, transform: "scale(1.1)" }
          default:
            return baseStyle
        }
      }

      return { ...baseStyle, opacity: 1, transform: "translateX(0) scale(1)" }
    }

    return (
      <div className="relative w-full h-full overflow-hidden bg-black rounded-lg">
        <div className={`w-full h-full ${transitionClasses[transitionType]}`} style={getTransitionStyle()}>
          {isImage && (
            <img
              src={item.media.file_path || "/placeholder.svg"}
              alt={item.media.name || "Media item"}
              className="w-full h-full object-contain"
              onLoad={() => setIsTransitioning(false)}
            />
          )}

          {isVideo && (
            <video
              ref={videoRef}
              src={item.media.file_path}
              className="w-full h-full object-contain"
              controls={false}
              muted={false}
              onLoadedData={() => setIsTransitioning(false)}
              onEnded={() => {
                // Auto-advance when video ends
                if (currentIndex < playlistItems.length - 1) {
                  goToNext()
                } else if (autoLoop) {
                  setCurrentIndex(0)
                  setTimeRemaining(playlistItems[0]?.duration_override || 10)
                } else {
                  setIsPlaying(false)
                }
              }}
              style={{
                playbackRate: playbackSpeed,
                volume: volume / 100,
              }}
            />
          )}

          {isGoogleSlides && (
            <iframe
              src={item.media.file_path.replace("/edit", "/embed?start=true&loop=false&delayms=3000")}
              className="w-full h-full border-0"
              allowFullScreen
              onLoad={() => setIsTransitioning(false)}
            />
          )}
        </div>

        {/* Transition overlay for cross-fade effect */}
        {transitionType === "cross-fade" && isTransitioning && (
          <div className="absolute inset-0 bg-black/20 transition-opacity duration-500" />
        )}
      </div>
    )
  }

  const goToNext = () => {
    if (currentIndex < playlistItems.length - 1) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1)
        setTimeRemaining(playlistItems[currentIndex + 1]?.duration_override || 10)
      }, transitionDuration * 500) // Start transition halfway through
    } else if (autoLoop) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(0)
        setTimeRemaining(playlistItems[0]?.duration_override || 10)
      }, transitionDuration * 500)
    } else {
      setIsPlaying(false)
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1)
        setTimeRemaining(playlistItems[currentIndex - 1]?.duration_override || 10)
      }, transitionDuration * 500)
    }
  }

  const togglePlayPause = () => {
    if (playlistItems.length === 0) return
    setIsPlaying(!isPlaying)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-6">
      <div className="w-1/3 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Playlists</h1>
            <p className="text-gray-600 mt-1">Create and manage content playlists</p>
          </div>
          <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={handleOpenCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search playlists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
          {filteredPlaylists.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <PlayCircle className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 text-center">
                  {playlists.length === 0 ? "No playlists yet" : "No playlists match your search"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredPlaylists.map((playlist) => (
              <Card
                key={playlist.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedPlaylist?.id === playlist.id ? "ring-2 ring-cyan-500 bg-cyan-50" : ""
                }`}
                onClick={() => setSelectedPlaylist(playlist)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" title={playlist.name}>
                        {playlist.name}
                      </h3>
                      {playlist.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{playlist.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        <span>{playlist.playlist_media?.[0]?.count || 0} items</span>
                        <span>{new Date(playlist.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreviewPlaylist(playlist)
                        }}
                        className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePlaylist(playlist.id)
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="flex-1">
        {selectedPlaylist ? (
          <div className="h-full">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedPlaylist.name}</h2>
              {selectedPlaylist.description && <p className="text-gray-600 mt-1">{selectedPlaylist.description}</p>}
            </div>

            <Tabs defaultValue="content" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="content" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Available Media</h3>
                  {loadingMedia ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                      {availableMedia.map((media) => (
                        <Card key={media.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="aspect-video bg-gray-100 rounded mb-2 flex items-center justify-center">
                              {media.mime_type?.startsWith("image/") ? (
                                <img
                                  src={media.file_path || "/placeholder.svg"}
                                  alt={media.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : media.mime_type?.startsWith("video/") ? (
                                <Video className="h-8 w-8 text-gray-400" />
                              ) : (
                                <ImageIcon className="h-8 w-8 text-gray-400" />
                              )}
                            </div>
                            <p className="text-sm font-medium truncate" title={media.name}>
                              {media.name}
                            </p>
                            <Button
                              size="sm"
                              className="w-full mt-2 bg-cyan-500 hover:bg-cyan-600"
                              onClick={() => handleAddMediaToPlaylist(media.id)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Playlist Items</h3>
                  {loadingItems ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
                    </div>
                  ) : playlistItems.length === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <PlayCircle className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">No items in this playlist</p>
                        <p className="text-xs text-gray-500 mt-1">Add media from the available media above</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {playlistItems.map((item, index) => (
                        <Card
                          key={item.id}
                          className={`transition-all duration-200 ${
                            dragOverIndex === index ? "border-blue-500 bg-blue-50" : ""
                          } ${draggedItem?.id === item.id ? "opacity-50" : ""}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="cursor-move text-gray-400 hover:text-gray-600">
                                <GripVertical className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-medium text-gray-500 w-6">{item.position}</span>
                              <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                {item.media.mime_type?.startsWith("image/") ? (
                                  <img
                                    src={item.media.file_path || "/placeholder.svg"}
                                    alt={item.media.name}
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : item.media.mime_type?.startsWith("video/") ? (
                                  <Video className="h-6 w-6 text-gray-400" />
                                ) : (
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{item.media.name}</p>
                                <p className="text-sm text-gray-600">Duration: {item.duration_override}s</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditItem(item)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveFromPlaylist(item.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Playlist Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input value={selectedPlaylist.name} readOnly />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea value={selectedPlaylist.description || ""} readOnly />
                      </div>
                      <div>
                        <Label>Created</Label>
                        <Input value={new Date(selectedPlaylist.created_at).toLocaleString()} readOnly />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Items</p>
                          <p className="text-2xl font-bold">{playlistItems.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Duration</p>
                          <p className="text-2xl font-bold">
                            {playlistItems.reduce((sum, item) => sum + item.duration_override, 0)}s
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Card className="h-full">
            <CardContent className="flex flex-col items-center justify-center h-full">
              <PlayCircle className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Playlist</h3>
              <p className="text-gray-600 text-center">
                Choose a playlist from the left panel to view and manage its content
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Playlist Item</DialogTitle>
            <DialogDescription>Modify the settings for this playlist item</DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              {/* Media Preview */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                  {editingItem.media.mime_type?.startsWith("image/") ? (
                    <img
                      src={editingItem.media.file_path || "/placeholder.svg"}
                      alt={editingItem.media.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : editingItem.media.mime_type?.startsWith("video/") ? (
                    <Video className="h-6 w-6 text-gray-400" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{editingItem.media.name}</p>
                  <p className="text-sm text-gray-500">{editingItem.media.mime_type}</p>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <Label htmlFor="item-name">Display Name</Label>
                <Input
                  id="item-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Item display name"
                />
              </div>

              {/* Duration */}
              <div>
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="3600"
                  value={editForm.duration_override}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, duration_override: Number.parseInt(e.target.value) || 10 }))
                  }
                />
                <p className="text-xs text-gray-500 mt-1">How long this item should display in the playlist</p>
              </div>

              {/* Position */}
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  type="number"
                  min="1"
                  value={editForm.position}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, position: Number.parseInt(e.target.value) || 1 }))}
                />
                <p className="text-xs text-gray-500 mt-1">Order position in the playlist</p>
              </div>

              {/* Video Clip Settings (for videos) */}
              {editingItem.media.mime_type?.startsWith("video/") && (
                <div className="space-y-3">
                  <Label>Video Clip Settings</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="start-time" className="text-sm">
                        Start Time (s)
                      </Label>
                      <Input
                        id="start-time"
                        type="number"
                        min="0"
                        value={editForm.start_time}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, start_time: Number.parseInt(e.target.value) || 0 }))
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-time" className="text-sm">
                        End Time (s)
                      </Label>
                      <Input
                        id="end-time"
                        type="number"
                        min="0"
                        value={editForm.end_time}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, end_time: Number.parseInt(e.target.value) || 0 }))
                        }
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Set start/end times to show only a portion of the video</p>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes or description for this item"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label>Transition Settings</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="transition-type" className="text-sm">
                      Transition Type
                    </Label>
                    <select
                      id="transition-type"
                      value={editForm.transition_type}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, transition_type: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="fade">Fade</option>
                      <option value="slide-left">Slide Left</option>
                      <option value="slide-right">Slide Right</option>
                      <option value="cross-fade">Cross Fade</option>
                      <option value="zoom">Zoom</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="transition-duration" className="text-sm">
                      Duration (seconds)
                    </Label>
                    <input
                      id="transition-duration"
                      type="number"
                      min="0.1"
                      max="3"
                      step="0.1"
                      value={editForm.transition_duration}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          transition_duration: Number.parseFloat(e.target.value) || 0.8,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Set how this item transitions when it appears in the playlist</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={updating}>
              {updating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : null}
              Update Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlaylistPreviewModal
        playlist={previewPlaylist}
        isOpen={!!previewPlaylist}
        onClose={() => {
          console.log("[v0] Closing preview modal")
          setPreviewPlaylist(null)
        }}
      />
    </div>
  )
}
