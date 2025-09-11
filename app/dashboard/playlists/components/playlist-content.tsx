"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Plus, Search, Trash2, Edit, GripVertical, ImageIcon, Video, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

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

interface PlaylistContentProps {
  playlistId: string
  onUpdate: () => void
}

export function PlaylistContent({ playlistId, onUpdate }: PlaylistContentProps) {
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([])
  const [availableMedia, setAvailableMedia] = useState<Media[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddMediaDialog, setShowAddMediaDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editForm, setEditForm] = useState({
    duration_override: 10,
    start_time: 0,
    end_time: 0,
    notes: "",
    transition_type: "fade" as "fade" | "slide-left" | "slide-right" | "cross-fade" | "zoom",
    transition_duration: 0.8,
  })
  const [updating, setUpdating] = useState(false)
  const [draggedItem, setDraggedItem] = useState<PlaylistItem | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    if (playlistId) {
      fetchPlaylistItems()
      fetchAvailableMedia()
    }
  }, [playlistId])

  const fetchPlaylistItems = async () => {
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
    try {
      const response = await fetch(`/api/playlists/${playlistId}/media`, {
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
        fetchPlaylistItems()
        onUpdate()
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
    try {
      const response = await fetch(`/api/playlists/${playlistId}/media`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_item_id: itemId,
        }),
      })

      if (response.ok) {
        fetchPlaylistItems()
        onUpdate()
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

  const handleEditItem = (item: PlaylistItem) => {
    setEditingItem(item)
    setEditForm({
      duration_override: item.duration_override || 10,
      start_time: item.start_time || 0,
      end_time: item.end_time || 0,
      notes: item.notes || "",
      transition_type: item.transition_type || "fade",
      transition_duration: item.transition_duration || 0.8,
    })
    setShowEditDialog(true)
  }

  const handleUpdateItem = async () => {
    if (!editingItem) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/playlists/${playlistId}/media`, {
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

    if (!draggedItem) return

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
      const response = await fetch(`/api/playlists/${playlistId}/reorder`, {
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
        fetchPlaylistItems()
        toast({
          title: "Error",
          description: "Failed to reorder items",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error reordering items:", error)
      fetchPlaylistItems()
      toast({
        title: "Error",
        description: "Failed to reorder items",
        variant: "destructive",
      })
    }

    setDraggedItem(null)
  }

  const getMediaIcon = (mimeType: string) => {
    if (mimeType?.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
    if (mimeType?.startsWith("video/")) return <Video className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  const filteredMedia = availableMedia.filter((media) => media.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loadingItems) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Playlist Items ({playlistItems.length})</h3>
        <Button onClick={() => setShowAddMediaDialog(true)} size="sm" className="bg-cyan-500 hover:bg-cyan-600">
          <Plus className="h-4 w-4 mr-1" />
          Add Media
        </Button>
      </div>

      {playlistItems.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No items in this playlist yet</p>
          <Button onClick={() => setShowAddMediaDialog(true)} variant="outline" size="sm" className="mt-2">
            Add your first item
          </Button>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {playlistItems.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-all cursor-move ${
                dragOverIndex === index ? "border-cyan-500 bg-cyan-50" : "border-gray-200"
              }`}
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
              <div className="flex items-center gap-2 text-gray-600">
                {getMediaIcon(item.media.mime_type)}
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.media.name}</p>
                <p className="text-xs text-gray-500">
                  {item.duration_override}s
                  {item.transition_type && item.transition_type !== "fade" && (
                    <span className="ml-2">• {item.transition_type}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditItem(item)}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFromPlaylist(item.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Media Dialog */}
      <Dialog open={showAddMediaDialog} onOpenChange={setShowAddMediaDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Media to Playlist</DialogTitle>
            <DialogDescription>Select media files to add to your playlist.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search media..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {loadingMedia ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500"></div>
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No media files found</p>
                </div>
              ) : (
                filteredMedia.map((media) => (
                  <Card key={media.id} className="cursor-pointer hover:shadow-sm transition-all">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getMediaIcon(media.mime_type)}
                          <div>
                            <p className="text-sm font-medium">{media.name}</p>
                            <p className="text-xs text-gray-500">{(media.file_size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            handleAddMediaToPlaylist(media.id)
                            setShowAddMediaDialog(false)
                          }}
                          size="sm"
                          className="bg-cyan-500 hover:bg-cyan-600"
                        >
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Playlist Item</DialogTitle>
            <DialogDescription>Modify the settings for this playlist item.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (seconds)</label>
              <Input
                type="number"
                min="1"
                value={editForm.duration_override}
                onChange={(e) => setEditForm({ ...editForm, duration_override: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transition Type</label>
              <Select
                value={editForm.transition_type}
                onValueChange={(value: any) => setEditForm({ ...editForm, transition_type: value })}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transition Duration (seconds)</label>
              <Input
                type="number"
                min="0.1"
                max="5"
                step="0.1"
                value={editForm.transition_duration}
                onChange={(e) => setEditForm({ ...editForm, transition_duration: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Optional notes for this item"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} disabled={updating}>
              {updating ? "Updating..." : "Update Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
