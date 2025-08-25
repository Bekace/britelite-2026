"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, Search, Grid, List, Trash2, Plus, ImageIcon, Video, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog" // Added import for custom confirmation dialog
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface MediaItem {
  id: string
  name: string
  mime_type: string
  file_size: number
  file_path: string
  tags: string[] | null
  created_at: string
}

function MediaPreviewModal({
  media,
  isOpen,
  onClose,
}: {
  media: MediaItem | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!media) return null

  const getGoogleSlidesEmbedUrl = (url: string) => {
    // Handle various Google Slides URL formats
    const patterns = [
      /https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)\/edit/,
      /https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9-_]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`
      }
    }

    // If already an embed URL, return as is
    if (url.includes("/embed")) {
      return url
    }

    return url
  }

  const isGoogleSlides = (media: MediaItem) => {
    return (
      media.file_path?.includes("docs.google.com/presentation") ||
      media.mime_type?.includes("presentation") ||
      media.name?.toLowerCase().includes("slides")
    )
  }

  const renderMedia = () => {
    if (media.mime_type?.startsWith("image/")) {
      return (
        <img src={media.file_path || "/placeholder.svg"} alt={media.name} className="w-full h-full object-contain" />
      )
    }

    if (media.mime_type?.startsWith("video/")) {
      return <video src={media.file_path} className="w-full h-full object-contain" controls playsInline />
    }

    if (isGoogleSlides(media)) {
      const embedUrl = getGoogleSlidesEmbedUrl(media.file_path || "")
      return <iframe src={embedUrl} className="w-full h-full border-0" allowFullScreen title={media.name} />
    }

    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Preview not available for this file type</p>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full p-0 m-0" style={{ width: "100vw", height: "100vh" }}>
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{media.name}</h2>
              <div className="flex items-center gap-4 text-sm text-white/80 mt-1">
                <span>{media.mime_type}</span>
                <span>{formatFileSize(media.file_size)}</span>
                <span>Created: {new Date(media.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4">
              {media.tags && media.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {media.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                      {tag}
                    </Badge>
                  ))}
                  {media.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                      +{media.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 border border-white/30"
              >
                Close
              </Button>
            </div>
          </div>
        </div>

        <div className="w-full h-full bg-black flex items-center justify-center pt-20">{renderMedia()}</div>
      </DialogContent>
    </Dialog>
  )
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [tags, setTags] = useState("")
  const [authError, setAuthError] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    itemId: string
    itemName: string
  }>({
    open: false,
    itemId: "",
    itemName: "",
  })
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    checkAuthAndFetchMedia()
  }, [])

  const checkAuthAndFetchMedia = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        console.error("Authentication error:", error)
        setAuthError(true)
        setLoading(false)
        toast({
          title: "Authentication Error",
          description: "Please log in to access the media library",
          variant: "destructive",
        })
        return
      }

      await fetchMedia()
    } catch (error) {
      console.error("Auth check error:", error)
      setAuthError(true)
      setLoading(false)
    }
  }

  const fetchMedia = async () => {
    try {
      const response = await fetch("/api/media/list")
      if (response.ok) {
        const data = await response.json()
        setMedia(Array.isArray(data.media) ? data.media : [])
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch media",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching media:", error)
      toast({
        title: "Error",
        description: "Failed to fetch media",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      const supabase = createClient()
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to upload media",
          variant: "destructive",
        })
        return
      }
    } catch (error) {
      console.error("Auth check error:", error)
      toast({
        title: "Error",
        description: "Authentication failed",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      if (tags) {
        formData.append("tags", tags)
      }

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const newMedia = await response.json()
        setMedia((prev) => [newMedia, ...prev])
        setSelectedFile(null)
        setTags("")
        toast({
          title: "Success",
          description: "Media uploaded successfully",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Upload failed",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Error",
        description: "Upload failed",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    setDeleteDialog({
      open: true,
      itemId: id,
      itemName: name,
    })
  }

  const handleConfirmDelete = async () => {
    const { itemId } = deleteDialog

    try {
      const response = await fetch("/api/media/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: itemId }),
      })

      if (response.ok) {
        setMedia((prev) => prev.filter((item) => item.id !== itemId))
        toast({
          title: "Success",
          description: "Media deleted successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to delete media",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete media",
        variant: "destructive",
      })
    }
  }

  const handlePreview = (media: MediaItem) => {
    setPreviewMedia(media)
  }

  const filteredMedia = media.filter((item) => {
    if (!item || !item.name) return false

    const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const tagMatch =
      item.tags &&
      Array.isArray(item.tags) &&
      item.tags.some((tag) => tag && typeof tag === "string" && tag.toLowerCase().includes(searchTerm.toLowerCase()))

    return nameMatch || tagMatch
  })

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access the media library</p>
        </div>
        <Button onClick={() => (window.location.href = "/auth/login")} className="bg-cyan-500 hover:bg-cyan-600">
          Go to Login
        </Button>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-600 mt-1">Upload and manage your digital signage content</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
            <Grid className="h-4 w-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Media
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input type="file" accept="image/*,video/*" onChange={handleFileSelect} className="flex-1" />
            <Input
              placeholder="Tags (comma separated)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-64"
            />
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Upload
            </Button>
          </div>
          {selectedFile && (
            <p className="text-sm text-gray-600">
              Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search media..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredMedia.length} of {media.length} items
        </div>
      </div>

      {/* Media Grid/List */}
      {filteredMedia.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No media found</h3>
            <p className="text-gray-600 text-center">
              {media.length === 0
                ? "Upload your first media file to get started"
                : "No media matches your search criteria"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "space-y-4"
          }
        >
          {filteredMedia.map((item) => (
            <Card key={item.id} className="group hover:shadow-lg transition-shadow">
              {viewMode === "grid" ? (
                <div>
                  <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative">
                    {item.mime_type && item.mime_type.startsWith("image/") ? (
                      <img
                        src={item.file_path || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Video className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePreview(item)}
                        className="bg-white/90 hover:bg-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id, item.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{formatFileSize(item.file_size)}</p>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </div>
              ) : (
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.mime_type && item.mime_type.startsWith("image/") ? (
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      ) : (
                        <Video className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        {formatFileSize(item.file_size)} • {new Date(item.created_at).toLocaleDateString()}
                      </p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(item)}
                        className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id, item.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {previewMedia && (
        <MediaPreviewModal media={previewMedia} isOpen={!!previewMedia} onClose={() => setPreviewMedia(null)} />
      )}

      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Media File"
        description={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone and will permanently remove the file from your media library.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  )
}
