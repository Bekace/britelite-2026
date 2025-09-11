"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import {
  PlayCircle,
  Plus,
  Search,
  Trash2,
  Eye,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Maximize,
  Minimize,
  X,
  Edit,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFeatureLimits } from "@/hooks/use-feature-limits"

interface Playlist {
  id: string
  name: string
  description: string
  created_at: string
  playlist_media: { count: number }[]
  background_color?: string
  scale_image?: string
  scale_video?: string
  scale_document?: string
  shuffle?: boolean
  default_transition?: string
  auto_loop?: boolean
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

const PlaylistPreviewModal = ({
  playlist,
  isOpen,
  onClose,
  backgroundColor = "#000000",
}: {
  playlist: Playlist
  isOpen: boolean
  onClose: () => void
  backgroundColor?: string
}) => {
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
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([])

  const goToNext = useCallback(() => {
    console.log("[v0] goToNext called, currentIndex:", currentIndex, "total items:", items.length)

    if (items.length === 0) {
      console.log("[v0] No items to advance to")
      return
    }

    const nextIndex = currentIndex + 1 < items.length ? currentIndex + 1 : autoLoop ? 0 : currentIndex

    if (nextIndex === currentIndex && !autoLoop) {
      console.log("[v0] Reached end of playlist, stopping")
      setIsPlaying(false)
      return
    }

    const nextItem = items[nextIndex]
    const transitionType = nextItem?.transition_type || "fade"
    const transitionDuration = nextItem?.transition_duration || 0.8

    console.log("[v0] Applying transition:", transitionType, "duration:", transitionDuration)
    console.log("[v0] Next item transition data:", {
      transition_type: nextItem?.transition_type,
      transition_duration: nextItem?.transition_duration,
      name: nextItem?.media?.name,
    })

    setIsTransitioning(true)

    setTimeout(() => {
      setCurrentIndex(nextIndex)
      setTimeRemaining(nextItem?.duration_override || 10)
      setIsTransitioning(false)
      console.log("[v0] Advanced to item", nextIndex + 1, "of", items.length)
    }, transitionDuration * 1000)
  }, [currentIndex, items, autoLoop])

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      const prevItem = items[prevIndex]
      const transitionType = prevItem?.transition_type || "fade"
      const transitionDuration = prevItem?.transition_duration || 0.8

      console.log("[v0] Previous transition:", transitionType, "duration:", transitionDuration)

      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(prevIndex)
        setTimeRemaining(prevItem?.duration_override || 10)
        setIsTransitioning(false)
      }, transitionDuration * 1000)
    } else if (autoLoop) {
      const lastIndex = items.length - 1
      const lastItem = items[lastIndex]
      const transitionType = lastItem?.transition_type || "fade"
      const transitionDuration = lastItem?.transition_duration || 0.8

      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(lastIndex)
        setTimeRemaining(lastItem?.duration_override || 10)
        setIsTransitioning(false)
      }, transitionDuration * 1000)
    }
  }, [currentIndex, items, autoLoop])

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
  }, [items, isPlaying])

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
        console.log("[v0] First item transition data:", {
          transition_type: sortedItems[0]?.transition_type,
          transition_duration: sortedItems[0]?.transition_duration,
        })
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

  const getTransitionStyles = (isTransitioning: boolean) => {
    const item = items[currentIndex]
    const transitionType = item?.transition_type || "fade"
    const transitionDuration = item?.transition_duration || 0.8

    const baseStyle = {
      transition: `all ${transitionDuration}s ease-in-out`,
      position: "absolute" as const,
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }

    if (!isTransitioning) {
      return {
        ...baseStyle,
        opacity: 1,
        transform: "translateX(0) translateY(0) scale(1)",
      }
    }

    // Apply different transition effects based on type
    switch (transitionType) {
      case "slide-left":
        return {
          ...baseStyle,
          opacity: 0,
          transform: "translateX(-100%)",
        }
      case "slide-right":
        return {
          ...baseStyle,
          opacity: 0,
          transform: "translateX(100%)",
        }
      case "zoom":
        return {
          ...baseStyle,
          opacity: 0,
          transform: "scale(0.8)",
        }
      case "cross-fade":
        return {
          ...baseStyle,
          opacity: 0,
          transform: "scale(1.05)",
        }
      case "fade":
      default:
        return {
          ...baseStyle,
          opacity: 0,
          transform: "translateX(0) translateY(0) scale(1)",
        }
    }
  }

  const renderMedia = () => {
    if (!items.length || currentIndex >= items.length) return null

    const item = items[currentIndex]
    const mediaStyle = getTransitionStyles(isTransitioning)

    return (
      <div className="relative w-full h-full overflow-hidden">
        {item.media.mime_type?.startsWith("image/") ? (
          <img src={item.media.file_path || "/placeholder.svg"} alt={item.media.name} style={mediaStyle} />
        ) : item.media.mime_type?.startsWith("video/") ? (
          <video src={item.media.file_path} style={mediaStyle} autoPlay muted={volume === 0} onEnded={goToNext} />
        ) : item.media.file_path?.includes("docs.google.com/presentation") ? (
          <iframe
            src={item.media.file_path.replace("/edit", "/embed")}
            style={mediaStyle}
            frameBorder="0"
            allowFullScreen
          />
        ) : (
          <div style={mediaStyle} className="flex items-center justify-center bg-gray-100 text-gray-500">
            <p>Unsupported media type</p>
          </div>
        )}
      </div>
    )
  }

  const currentItem = items[currentIndex]

  useEffect(() => {
    if (isPlaying && timeRemaining > 0) {
      console.log("[v0] Timer running, time remaining:", timeRemaining)
      const timer = setTimeout(() => {
        console.log("[v0] Timer tick, new time:", timeRemaining - 1)
        setTimeRemaining((prev) => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (isPlaying && timeRemaining === 0) {
      console.log("[v0] Timer finished, calling goToNext")
      goToNext()
    }
  }, [isPlaying, timeRemaining, goToNext])

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

  if (!playlist) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-none w-full h-full p-0 bg-black border-none"
        style={{ backgroundColor }} // Apply playlist-specific background color
      >
        <div className="absolute top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <h2 className="text-white font-semibold">{playlist?.name}</h2>
              <span className="text-white/70 text-sm">
                {items.length > 0 ? `${currentIndex + 1} of ${items.length} items` : "Loading..."}
              </span>
              {isPlaying && <span className="text-cyan-400 text-sm">● Auto-playing</span>}
            </div>

            <div className="flex items-center gap-2">
              {/* Playback Controls */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
              </button>

              <button
                onClick={goToPrevious}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <SkipBack className="w-5 h-5 text-white" />
              </button>

              <button onClick={goToNext} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                <SkipForward className="w-5 h-5 text-white" />
              </button>

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-white" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(Number.parseFloat(e.target.value))}
                  className="w-16 h-1 bg-white/30 rounded-lg appearance-none slider"
                />
              </div>

              {/* Auto Loop */}
              <label className="flex items-center gap-2 text-white text-sm">
                <input
                  type="checkbox"
                  checked={autoLoop}
                  onChange={(e) => setAutoLoop(e.target.checked)}
                  className="rounded"
                />
                Loop
              </label>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 text-white" />
                )}
              </button>

              <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 relative bg-black overflow-hidden">{renderMedia()}</div>
      </DialogContent>
    </Dialog>
  )
}

export default function PlaylistsPage() {
  const { canCreatePlaylist, limits, usage, refreshUsage } = useFeatureLimits()

  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newPlaylist, setNewPlaylist] = useState({
    name: "",
    description: "",
    scale_image: "fit",
    scale_video: "fit",
    scale_document: "fit",
    shuffle: false,
    default_transition: "fade",
    auto_loop: true,
  })
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

  const [playlistBackgroundColor, setPlaylistBackgroundColor] = useState(
    selectedPlaylist?.background_color || "#000000",
  )

  const { toast } = useToast()

  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [showEditPlaylistDialog, setShowEditPlaylistDialog] = useState(false)
  const [editPlaylistForm, setEditPlaylistForm] = useState({
    name: "",
    description: "",
    background_color: "#000000",
    auto_loop: true,
    shuffle: false,
    default_transition: "fade" as "fade" | "slide-left" | "slide-right" | "cross-fade" | "zoom",
  })

  useEffect(() => {
    fetchPlaylists()
    fetchAvailableMedia()
  }, [])

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistItems(selectedPlaylist.id)
    }
  }, [selectedPlaylist])

  useEffect(() => {
    if (selectedPlaylist) {
      console.log(
        "[v0] Setting background color for playlist:",
        selectedPlaylist.name,
        selectedPlaylist.background_color,
      )
      setPlaylistBackgroundColor(selectedPlaylist.background_color || "#000000")
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
    if (!canCreatePlaylist) {
      toast({
        title: "Playlist Limit Reached",
        description: `Your plan allows ${limits?.maxPlaylists || 0} playlists maximum. Upgrade your plan to create more playlists.`,
        variant: "destructive",
      })
      return
    }

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
        setNewPlaylist({
          name: "",
          description: "",
          scale_image: "fit",
          scale_video: "fit",
          scale_document: "fit",
          shuffle: false,
          default_transition: "fade",
          auto_loop: true,
        })
        setShowCreateDialog(false)
        setSelectedPlaylist(newPlaylistData)

        await refreshUsage()

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

  const goToNext = useCallback(() => {
    console.log("[v0] goToNext called, currentIndex:", currentIndex, "total items:", playlistItems.length)

    if (currentIndex < playlistItems.length - 1) {
      const nextItem = playlistItems[currentIndex + 1]
      const transitionType = nextItem?.transition_type || "fade"
      const transitionDuration = nextItem?.transition_duration || 0.8

      console.log(
        "[v0] Applying transition:",
        transitionType,
        "duration:",
        transitionDuration,
        "for item:",
        nextItem.media?.name,
      )

      setIsTransitioning(true)
      setTimeout(() => {
        console.log("[v0] Transition complete, moving to next item")
        setCurrentIndex((prev) => prev + 1)
        setTimeRemaining(playlistItems[currentIndex + 1]?.duration_override || 10)
        setIsTransitioning(false)
      }, transitionDuration * 1000)
    } else if (autoLoop) {
      const firstItem = playlistItems[0]
      const transitionType = firstItem?.transition_type || "fade"
      const transitionDuration = firstItem?.transition_duration || 0.8

      console.log("[v0] Loop transition:", transitionType, "duration:", transitionDuration)

      setIsTransitioning(true)
      setTimeout(() => {
        console.log("[v0] Loop transition complete, back to first item")
        setCurrentIndex(0)
        setTimeRemaining(playlistItems[0]?.duration_override || 10)
        setIsTransitioning(false)
      }, transitionDuration * 1000)
    } else {
      console.log("[v0] Playlist finished, stopping playback")
      setIsPlaying(false)
    }
  }, [autoLoop, currentIndex, playlistItems, setIsPlaying, setIsTransitioning, setTimeRemaining])

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const previousItem = playlistItems[currentIndex - 1]
      const transitionType = previousItem?.transition_type || "fade"
      const transitionDuration = previousItem?.transition_duration || 0.8

      console.log("[v0] Previous transition:", transitionType, "duration:", transitionDuration)

      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1)
        setTimeRemaining(playlistItems[currentIndex - 1]?.duration_override || 10)
        setIsTransitioning(false)
      }, transitionDuration * 1000)
    }
  }

  const renderMedia = () => {
    if (!playlistItems.length || currentIndex >= playlistItems.length) return null

    const item = playlistItems[currentIndex]
    const transitionType = item.transition_type || "fade"
    const transitionDuration = item.transition_duration || 0.8

    console.log("[v0] Rendering item with transition:", transitionType, "transitioning:", isTransitioning)

    const isImage = item.media.mime_type?.startsWith("image/")
    const isVideo = item.media.mime_type?.startsWith("video/")
    const isGoogleSlides = item.media.file_path?.includes("docs.google.com/presentation")

    const getTransitionStyle = () => {
      const baseStyle = {
        transitionDuration: `${transitionDuration}s`,
        transitionTimingFunction: "ease-in-out",
      }

      if (isTransitioning) {
        switch (transitionType) {
          case "fade":
            return { ...baseStyle, opacity: 0 }
          case "slide-left":
            return { ...baseStyle, transform: "translateX(-100%)", opacity: 1 }
          case "slide-right":
            return { ...baseStyle, transform: "translateX(100%)", opacity: 1 }
          case "cross-fade":
            return { ...baseStyle, opacity: 0, transform: "scale(0.95)" }
          case "zoom":
            return { ...baseStyle, opacity: 0, transform: "scale(1.1)" }
          default:
            return { ...baseStyle, opacity: 0 }
        }
      }

      return { ...baseStyle, opacity: 1, transform: "translateX(0) scale(1)" }
    }

    return (
      <div className="relative w-full h-full overflow-hidden bg-black rounded-lg">
        <div className="w-full h-full transition-all" style={getTransitionStyle()}>
          {isImage && (
            <img
              src={item.media.file_path || "/placeholder.svg"}
              alt={item.media.name}
              className="w-full h-full object-contain"
            />
          )}
          {isVideo && (
            <video
              ref={videoRef}
              src={item.media.file_path}
              className="w-full h-full object-contain"
              controls={false}
              autoPlay
              muted={volume === 0}
              onEnded={goToNext}
              style={{ playbackRate: playbackSpeed }}
            />
          )}
          {isGoogleSlides && (
            <iframe
              src={item.media.file_path?.replace("/edit", "/embed")}
              className="w-full h-full border-0"
              allowFullScreen
            />
          )}
        </div>

        {transitionType === "cross-fade" && isTransitioning && (
          <div className="absolute inset-0 bg-black/20 transition-opacity duration-500" />
        )}
      </div>
    )
  }

  const togglePlayPause = () => {
    if (playlistItems.length === 0) return
    setIsPlaying(!isPlaying)
  }

  const handleEditPlaylist = (playlist: Playlist) => {
    setEditingPlaylist(playlist)
    setEditPlaylistForm({
      name: playlist.name,
      description: playlist.description || "",
      background_color: playlist.background_color || "#000000",
      auto_loop: playlist.auto_loop ?? true,
      shuffle: playlist.shuffle ?? false,
      default_transition: (playlist.default_transition as any) || "fade",
    })
    setShowEditPlaylistDialog(true)
  }

  const handleUpdatePlaylist = async () => {
    if (!editingPlaylist) return

    setCreating(true)
    try {
      const response = await fetch(`/api/playlists/${editingPlaylist.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPlaylistForm),
      })

      if (!response.ok) throw new Error("Failed to update playlist")

      // Update the playlist in the local state
      setPlaylists((prev) =>
        prev.map((playlist) => (playlist.id === editingPlaylist.id ? { ...playlist, ...editPlaylistForm } : playlist)),
      )

      // Update selected playlist if it's the one being edited
      if (selectedPlaylist?.id === editingPlaylist.id) {
        setSelectedPlaylist({ ...selectedPlaylist, ...editPlaylistForm })
      }

      setShowEditPlaylistDialog(false)
      setEditingPlaylist(null)
      toast({ title: "Playlist updated successfully" })
    } catch (error) {
      console.error("Error updating playlist:", error)
      toast({
        title: "Error",
        description: "Failed to update playlist",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleUpdatePlaylistBackground = async (backgroundColor: string) => {
    if (!selectedPlaylist) return

    try {
      console.log("[v0] Updating background color for playlist:", selectedPlaylist.name, "to:", backgroundColor)
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ background_color: backgroundColor }),
      })

      if (!response.ok) throw new Error("Failed to update background color")

      const { playlist } = await response.json()
      console.log("[v0] Background color updated successfully:", playlist.background_color)

      setPlaylists((prev) =>
        prev.map((p) => (p.id === selectedPlaylist.id ? { ...p, background_color: backgroundColor } : p)),
      )

      // Update selectedPlaylist to reflect the change
      if (selectedPlaylist.id === playlist.id) {
        setSelectedPlaylist({ ...selectedPlaylist, background_color: backgroundColor })
      }
    } catch (error) {
      console.error("Error updating background color:", error)
    }
  }

  const handleUpdatePlaylistSettings = async (
    settings: Partial<{
      scale_image: string
      scale_video: string
      scale_document: string
      shuffle: boolean
      default_transition: string
    }>,
  ) => {
    if (!selectedPlaylist) return

    try {
      const response = await fetch(`/api/playlists/${selectedPlaylist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) throw new Error("Failed to update playlist settings")

      const { playlist } = await response.json()

      setPlaylists((prev) => prev.map((p) => (p.id === selectedPlaylist.id ? { ...p, ...settings } : p)))

      setSelectedPlaylist({ ...selectedPlaylist, ...settings })
    } catch (error) {
      console.error("Error updating playlist settings:", error)
      toast({
        title: "Error",
        description: "Failed to update playlist settings",
        variant: "destructive",
      })
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
          <h1 className="text-3xl font-bold text-gray-900">Playlists</h1>
          <p className="text-gray-600 mt-1">
            Create and manage content playlists
            {usage && limits && (
              <span className="ml-2 text-sm">
                ({usage.currentPlaylists}/{limits.maxPlaylists} playlists used)
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          disabled={!canCreatePlaylist}
          className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50"
          title={!canCreatePlaylist ? `Playlist limit reached (${limits?.maxPlaylists || 0} maximum)` : ""}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Playlist
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
                        handleEditPlaylist(playlist)
                      }}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
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

      <Dialog open={showEditPlaylistDialog} onOpenChange={setShowEditPlaylistDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>Update your playlist settings and information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <Input
                id="edit-name"
                value={editPlaylistForm.name}
                onChange={(e) => setEditPlaylistForm({ ...editPlaylistForm, name: e.target.value })}
                placeholder="Enter playlist name"
              />
            </div>
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <Textarea
                id="edit-description"
                value={editPlaylistForm.description}
                onChange={(e) => setEditPlaylistForm({ ...editPlaylistForm, description: e.target.value })}
                placeholder="Enter playlist description"
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="edit-background-color" className="block text-sm font-medium text-gray-700">
                Background Color
              </label>
              <Input
                id="edit-background-color"
                type="color"
                value={editPlaylistForm.background_color}
                onChange={(e) => setEditPlaylistForm({ ...editPlaylistForm, background_color: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="edit-default-transition" className="block text-sm font-medium text-gray-700">
                Default Transition
              </label>
              <Select
                value={editPlaylistForm.default_transition}
                onValueChange={(value: any) => setEditPlaylistForm({ ...editPlaylistForm, default_transition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fade">Fade</SelectItem>
                  <SelectItem value="slide-left">Slide Left</SelectItem>
                  <SelectItem value="slide-right">Slide Right</SelectItem>
                  <SelectItem value="cross-fade">Cross Fade</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-auto-loop"
                checked={editPlaylistForm.auto_loop}
                onCheckedChange={(checked) => setEditPlaylistForm({ ...editPlaylistForm, auto_loop: !!checked })}
              />
              <label htmlFor="edit-auto-loop" className="text-sm font-medium text-gray-700">
                Auto Loop
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-shuffle"
                checked={editPlaylistForm.shuffle}
                onCheckedChange={(checked) => setEditPlaylistForm({ ...editPlaylistForm, shuffle: !!checked })}
              />
              <label htmlFor="edit-shuffle" className="text-sm font-medium text-gray-700">
                Shuffle
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPlaylistDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePlaylist} disabled={creating || !editPlaylistForm.name.trim()}>
              {creating ? "Updating..." : "Update Playlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
