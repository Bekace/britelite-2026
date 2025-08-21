"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
import { Label } from "@/components/ui/label"
import { PlayCircle, Plus, Search, Edit, Trash2, Clock, ImageIcon, Eye, X, Play, Pause } from "lucide-react"
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
    }
  }, [isOpen, playlist])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Move to next item
            setCurrentIndex((currentIdx) => {
              const nextIndex = currentIdx + 1
              if (nextIndex >= items.length) {
                // End of playlist
                setIsPlaying(false)
                return 0
              }
              return nextIndex
            })
            return items[currentIndex + 1]?.duration_override || 10
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isPlaying, timeRemaining, items, currentIndex])

  const fetchPlaylistItems = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/playlists/${playlist.id}`)
      if (response.ok) {
        const data = await response.json()
        const sortedItems =
          data.playlist.playlist_items?.sort((a: PlaylistItem, b: PlaylistItem) => a.position - b.position) || []
        setItems(sortedItems)
        if (sortedItems.length > 0) {
          setTimeRemaining(sortedItems[0].duration_override || 10)
        }
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
    if (timeRemaining === 0) {
      setTimeRemaining(items[currentIndex]?.duration_override || 10)
    }
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleReset = () => {
    setIsPlaying(false)
    setCurrentIndex(0)
    setTimeRemaining(items[0]?.duration_override || 10)
  }

  const currentItem = items[currentIndex]

  const renderMediaPreview = (item: PlaylistItem) => {
    if (item.media.mime_type?.startsWith("image/")) {
      return (
        <img
          src={item.media.file_path || "/placeholder.svg"}
          alt={item.media.name}
          className="w-full h-full object-contain"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg?height=400&width=600&text=Image+Not+Found"
          }}
        />
      )
    } else if (item.media.mime_type?.startsWith("video/")) {
      return (
        <video
          src={item.media.file_path}
          className="w-full h-full object-contain"
          autoPlay
          muted
          loop
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
      )
    } else if (item.media.mime_type === "application/vnd.google-apps.presentation") {
      const embedUrl = item.media.file_path.includes("/edit")
        ? item.media.file_path.replace("/edit", "/embed")
        : `${item.media.file_path}/embed`

      return <iframe src={embedUrl} className="w-full h-full border-0" title={item.media.name} />
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-xl font-semibold">{playlist.name} Preview</h2>
              <p className="text-sm text-gray-600">
                {currentIndex + 1} of {items.length} items
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Media Display */}
          <div className="flex-1 bg-black relative">
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
                {renderMediaPreview(currentItem)}
                {/* Media Info Overlay */}
                <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded">
                  <p className="font-medium">{currentItem.media.name}</p>
                  <p className="text-sm opacity-75">
                    Duration: {currentItem.duration_override}s | Remaining: {timeRemaining}s
                  </p>
                </div>
              </>
            ) : null}
          </div>

          {/* Controls */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" onClick={handleReset} disabled={items.length === 0}>
                Reset
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
              <div className="text-sm text-gray-600">
                Total Duration: {items.reduce((sum, item) => sum + (item.duration_override || 10), 0)}s
              </div>
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
  const { toast } = useToast()

  useEffect(() => {
    fetchPlaylists()
  }, [])

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
        setPlaylists((prev) => [{ ...data.playlist, playlist_media: [{ count: 0 }] }, ...prev])
        setNewPlaylist({ name: "", description: "" })
        setShowCreateDialog(false)
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
          <p className="text-gray-600 mt-1">Create and manage content playlists for your screens</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-500 hover:bg-cyan-600">
              <Plus className="h-4 w-4 mr-2" />
              Create Playlist
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

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search playlists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredPlaylists.length} of {playlists.length} playlists
        </div>
      </div>

      {/* Playlists Grid */}
      {filteredPlaylists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PlayCircle className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No playlists found</h3>
            <p className="text-gray-600 text-center mb-4">
              {playlists.length === 0
                ? "Create your first playlist to organize your media content"
                : "No playlists match your search criteria"}
            </p>
            {playlists.length === 0 && (
              <Button onClick={() => setShowCreateDialog(true)} className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="h-4 w-4 mr-2" />
                Create Playlist
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaylists.map((playlist) => (
            <Card key={playlist.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" title={playlist.name}>
                      {playlist.name}
                    </CardTitle>
                    {playlist.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{playlist.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewPlaylist(playlist)}
                      className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/playlists/${playlist.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePlaylist(playlist.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <ImageIcon className="h-4 w-4" />
                      <span>{playlist.playlist_media?.[0]?.count || 0} items</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{(playlist.playlist_media?.[0]?.count || 0) * 10} sec</span>
                    </div>
                  </div>
                  <Badge variant="secondary">{new Date(playlist.created_at).toLocaleDateString()}</Badge>
                </div>
                <div className="mt-4">
                  <Button asChild className="w-full bg-cyan-500 hover:bg-cyan-600">
                    <Link href={`/dashboard/playlists/${playlist.id}`}>
                      <PlayCircle className="h-4 w-4 mr-2" />
                      Manage Playlist
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Modal */}
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
