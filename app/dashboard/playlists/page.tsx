"use client"

import { DialogFooter } from "@/components/ui/dialog"
import { DialogTrigger } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
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
}

interface Media {
  id: string
  name: string
  file_path: string
  mime_type: string
  file_size: number
  created_at: string
}

function PlaylistPreviewModal({
  playlist,
  isOpen,
  onClose,
}: { playlist: Playlist; isOpen: boolean; onClose: () => void }) {
  const [items, setItems] = useState<PlaylistItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && playlist) {
      fetchPlaylistItems()
    } else {
      setCurrentIndex(0)
      setIsPlaying(false)
      setTimeRemaining(0)
      setItems([])
    }
  }, [isOpen, playlist])

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
          setIsPlaying(false)
          setCurrentIndex(0)
          setTimeRemaining(items[0]?.duration_override || 10)
        }
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [isPlaying, timeRemaining, currentIndex, items])

  const fetchPlaylistItems = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/playlists/${playlist.id}`)
      if (response.ok) {
        const data = await response.json()
        const sortedItems =
          data.playlist.playlist_items?.sort((a: PlaylistItem, b: PlaylistItem) => a.position - b.position) || []
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
    }
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentIndex(0)
    setTimeRemaining(items[0]?.duration_override || 10)
  }

  const renderSimpleMedia = (item: PlaylistItem) => {
    if (item.media.mime_type?.startsWith("image/")) {
      return (
        <img
          src={item.media.file_path || "/placeholder.svg"}
          alt={item.media.name}
          className="w-full h-full object-contain"
          style={{ pointerEvents: "none" }}
        />
      )
    }

    if (item.media.mime_type?.startsWith("video/")) {
      return (
        <video
          src={item.media.file_path}
          className="w-full h-full object-contain"
          muted
          playsInline
          style={{ pointerEvents: "none" }}
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
          style={{ pointerEvents: "none" }}
        />
      )
    }

    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Unsupported media type</p>
        </div>
      </div>
    )
  }

  const currentItem = items[currentIndex]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl p-0" style={{ height: "calc(100vh - 100px)" }}>
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{playlist.name} Preview</DialogTitle>
          <DialogDescription>
            {items.length > 0 ? `${currentIndex + 1} of ${items.length} items` : "Loading..."}
          </DialogDescription>
        </DialogHeader>

        <div className="mx-6 bg-black relative" style={{ aspectRatio: "16/9" }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white">
              <div className="text-center">
                <PlayCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No media items in this playlist</p>
              </div>
            </div>
          ) : currentItem ? (
            <>
              {renderSimpleMedia(currentItem)}
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded">
                <p className="font-medium">{currentItem.media.name}</p>
                <p className="text-sm opacity-75">
                  {timeRemaining}s remaining • {currentItem.duration_override}s total
                </p>
              </div>
            </>
          ) : null}
        </div>

        <div className="p-6 pt-4 border-t bg-gray-50">
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
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

            <Button variant="outline" size="sm" onClick={handleNext} disabled={currentIndex >= items.length - 1}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600 mt-2">
            Total: {items.reduce((sum, item) => sum + (item.duration_override || 10), 0)}s
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
    }
  }

  const filteredPlaylists = playlists.filter((playlist) =>
    playlist.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handlePreviewPlaylist = (playlist: Playlist) => {
    setShowCreateDialog(false)
    setPreviewPlaylist(playlist)
  }

  const handleOpenCreateDialog = () => {
    setPreviewPlaylist(null)
    setShowCreateDialog(true)
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
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={handleOpenCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Playlist</DialogTitle>
                <DialogDescription>Create a new playlist to organize your media content.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter playlist name"
                    value={newPlaylist.name}
                    onChange={(e) => setNewPlaylist((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter playlist description (optional)"
                    value={newPlaylist.description}
                    onChange={(e) => setNewPlaylist((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePlaylist} disabled={!newPlaylist.name.trim() || creating}>
                  {creating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                        <Card key={item.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                              </div>
                              <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center">
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFromPlaylist(item.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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

      {previewPlaylist && (
        <PlaylistPreviewModal
          playlist={previewPlaylist}
          isOpen={!!previewPlaylist}
          onClose={() => setPreviewPlaylist(null)}
        />
      )}
    </div>
  )
}
