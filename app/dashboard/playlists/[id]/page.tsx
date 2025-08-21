"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Clock, ImageIcon, Video, GripVertical, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MediaItem {
  id: string
  name: string
  file_type: string
  file_size: number
  file_path: string
  tags: string[]
}

interface PlaylistMediaItem {
  id: string
  duration_override: number
  position: number
  media: MediaItem
}

interface Playlist {
  id: string
  name: string
  description: string
  playlist_items: PlaylistMediaItem[]
}

export default function PlaylistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [availableMedia, setAvailableMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddMediaDialog, setShowAddMediaDialog] = useState(false)
  const [showEditDurationDialog, setShowEditDurationDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<PlaylistMediaItem | null>(null)
  const [editDuration, setEditDuration] = useState(10)
  const [selectedMedia, setSelectedMedia] = useState<string>("")
  const [duration, setDuration] = useState(10)
  const { toast } = useToast()

  useEffect(() => {
    if (params.id) {
      fetchPlaylist()
      fetchAvailableMedia()
    }
  }, [params.id])

  const fetchPlaylist = async () => {
    try {
      console.log("[v0] Fetching playlist for ID:", params.id)
      const response = await fetch(`/api/playlists/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Playlist data received:", data)
        if (data.playlist?.playlist_items) {
          console.log("[v0] Playlist items count:", data.playlist.playlist_items.length)
          data.playlist.playlist_items.forEach((item, index) => {
            console.log(`[v0] Item ${index}:`, {
              id: item.id,
              media: item.media,
              mediaName: item.media?.name,
              mediaFileType: item.media?.file_type,
              mediaFileSize: item.media?.file_size,
            })
          })
        }
        setPlaylist(data.playlist)
      } else {
        console.log("[v0] Playlist fetch failed with status:", response.status)
        toast({
          title: "Error",
          description: "Failed to fetch playlist",
          variant: "destructive",
        })
        router.push("/dashboard/playlists")
      }
    } catch (error) {
      console.error("Error fetching playlist:", error)
      toast({
        title: "Error",
        description: "Failed to fetch playlist",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableMedia = async () => {
    try {
      console.log("[v0] Fetching available media")
      const response = await fetch("/api/media/list")
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Available media received:", data)
        if (data.media) {
          console.log("[v0] Available media count:", data.media.length)
          data.media.slice(0, 3).forEach((media, index) => {
            console.log(`[v0] Media ${index}:`, {
              id: media.id,
              name: media.name,
              file_type: media.file_type,
              file_size: media.file_size,
            })
          })
        }
        setAvailableMedia(data.media || [])
      } else {
        console.log("[v0] Media fetch failed with status:", response.status)
      }
    } catch (error) {
      console.error("Error fetching media:", error)
    }
  }

  const handleAddMedia = async () => {
    if (!selectedMedia) return

    try {
      const response = await fetch(`/api/playlists/${params.id}/media`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_id: selectedMedia,
          duration,
        }),
      })

      if (response.ok) {
        await fetchPlaylist()
        setSelectedMedia("")
        setDuration(10)
        setShowAddMediaDialog(false)
        toast({
          title: "Success",
          description: "Media added to playlist",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to add media",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Add media error:", error)
      toast({
        title: "Error",
        description: "Failed to add media",
        variant: "destructive",
      })
    }
  }

  const handleDeleteMedia = async (playlistItemId: string) => {
    try {
      const response = await fetch(`/api/playlists/${params.id}/media`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_item_id: playlistItemId,
        }),
      })

      if (response.ok) {
        await fetchPlaylist()
        toast({
          title: "Success",
          description: "Media removed from playlist",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to remove media",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete media error:", error)
      toast({
        title: "Error",
        description: "Failed to remove media",
        variant: "destructive",
      })
    }
  }

  const handleEditDuration = async () => {
    if (!editingItem) return

    try {
      const response = await fetch(`/api/playlists/${params.id}/media`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_item_id: editingItem.id,
          duration_override: editDuration,
        }),
      })

      if (response.ok) {
        await fetchPlaylist()
        setShowEditDurationDialog(false)
        setEditingItem(null)
        toast({
          title: "Success",
          description: "Duration updated successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update duration",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Edit duration error:", error)
      toast({
        title: "Error",
        description: "Failed to update duration",
        variant: "destructive",
      })
    }
  }

  const openEditDurationDialog = (item: PlaylistMediaItem) => {
    setEditingItem(item)
    setEditDuration(item.duration_override || 10)
    setShowEditDurationDialog(true)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getTotalDuration = () => {
    if (!playlist?.playlist_items) return 0
    return playlist.playlist_items.reduce((total, item) => {
      return total + (item?.duration_override || 10)
    }, 0)
  }

  const getMediaDisplayName = (media: MediaItem) => {
    if (media.name && media.name.trim()) {
      return media.name
    }
    if (media.file_type) {
      const extension = media.file_type.split("/")[1] || "file"
      return `Untitled.${extension}`
    }
    return "Untitled"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Playlist not found</h2>
        <Button onClick={() => router.push("/dashboard/playlists")} className="mt-4">
          Back to Playlists
        </Button>
      </div>
    )
  }

  const playlistItems = playlist.playlist_items || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/playlists")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Playlists
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{playlist.name}</h1>
          {playlist.description && <p className="text-gray-600 mt-1">{playlist.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <ImageIcon className="h-4 w-4" />
              <span>{playlistItems.length} items</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{getTotalDuration()} seconds total</span>
            </div>
          </div>
        </div>
        <Dialog open={showAddMediaDialog} onOpenChange={setShowAddMediaDialog}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Media
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Media to Playlist</DialogTitle>
              <DialogDescription>Select media from your library to add to this playlist.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="duration">Display Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="300"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Select Media</Label>
                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto mt-2">
                  {(availableMedia || []).map((media) => (
                    <Card
                      key={media.id}
                      className={`cursor-pointer transition-colors ${
                        selectedMedia === media.id ? "ring-2 ring-cyan-500 bg-cyan-50" : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedMedia(media.id)}
                    >
                      <CardContent className="p-3">
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden mb-2">
                          {media.file_type?.startsWith("image/") ? (
                            <img
                              src={media.file_path || "/placeholder.svg"}
                              alt={media.name || "Media"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Video className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <h4 className="font-medium text-sm truncate" title={getMediaDisplayName(media)}>
                          {getMediaDisplayName(media)}
                        </h4>
                        <p className="text-xs text-gray-600">{formatFileSize(media.file_size || 0)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddMediaDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddMedia} disabled={!selectedMedia}>
                Add to Playlist
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={showEditDurationDialog} onOpenChange={setShowEditDurationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Duration</DialogTitle>
            <DialogDescription>
              Set the display duration for "{editingItem?.media ? getMediaDisplayName(editingItem.media) : ""}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-duration">Display Duration (seconds)</Label>
              <Input
                id="edit-duration"
                type="number"
                min="1"
                max="300"
                value={editDuration}
                onChange={(e) => setEditDuration(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowEditDurationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditDuration}>Update Duration</Button>
          </div>
        </DialogContent>
      </Dialog>

      {playlistItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No media in playlist</h3>
            <p className="text-gray-600 text-center mb-4">
              Add media from your library to start building this playlist
            </p>
            <Button onClick={() => setShowAddMediaDialog(true)} className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Media
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {playlistItems
            .sort((a, b) => (a?.position || 0) - (b?.position || 0))
            .map((item, index) => {
              if (!item?.media) return null
              return (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <GripVertical className="h-4 w-4" />
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.media.file_type?.startsWith("image/") ? (
                          <img
                            src={item.media.file_path || "/placeholder.svg"}
                            alt={item.media.name || "Media"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Video className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate" title={getMediaDisplayName(item.media)}>
                          {getMediaDisplayName(item.media)}
                        </h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>{formatFileSize(item.media.file_size || 0)}</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{item.duration_override || 10}s</span>
                          </div>
                        </div>
                        {(item.media.tags?.length || 0) > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(item.media.tags || []).slice(0, 3).map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {(item.media.tags?.length || 0) > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(item.media.tags?.length || 0) - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDurationDialog(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDeleteMedia(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  )
}
