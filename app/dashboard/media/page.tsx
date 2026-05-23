"use client"

import { useState, useEffect } from "react"
import { SimpleUploader } from "@/components/media/simple-uploader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  LinkIcon,
  Video,
  Image as ImageIcon,
  Grid,
  List,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  ListPlus,
} from "lucide-react"
import { usePlanLimits } from "@/hooks/use-plan-limits"
import { useUploadLimits } from "@/hooks/use-upload-limits"
import { SmartFileUploader } from "@/components/media/smart-file-uploader"
import { StorageUsageBar } from "@/components/ui/storage-usage-bar"
import { UpgradeBanner } from "@/components/upgrade-banner"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetFooter,
} from "@/components/ui/bottom-sheet"

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
    if (url.includes("/embed")) return url
    return url
  }

  const isGoogleSlides = (media: MediaItem) => {
    return (
      media.file_path?.includes("docs.google.com/presentation") ||
      media.mime_type?.includes("presentation") ||
      media.name?.toLowerCase().includes("slides")
    )
  }

  const isYouTubeVideo = (media: MediaItem) => {
    return (
      media.mime_type === "video/youtube" ||
      media.file_path?.includes("youtube.com/embed") ||
      media.file_path?.includes("youtube-nocookie.com/embed")
    )
  }

  const getYouTubeUrlWithAutoplay = (url: string) => {
    try {
      const urlObj = new URL(url)
      urlObj.searchParams.set("autoplay", "1")
      urlObj.searchParams.set("mute", "1")
      urlObj.searchParams.set("controls", "0")
      urlObj.searchParams.set("showinfo", "0")
      urlObj.searchParams.set("fs", "0")
      urlObj.searchParams.set("modestbranding", "1")
      urlObj.searchParams.set("iv_load_policy", "3")
      return urlObj.toString()
    } catch {
      return url
    }
  }

  const renderMedia = () => {
    if (media.mime_type?.startsWith("image/")) {
      return <img src={media.file_path || "/placeholder.svg"} alt={media.name} className="w-full h-full object-contain" />
    }
    if (isYouTubeVideo(media)) {
      const autoplayUrl = getYouTubeUrlWithAutoplay(media.file_path)
      return (
        <iframe
          key={media.id}
          src={autoplayUrl}
          className="w-full h-full border-0"
          allowFullScreen
          title={media.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )
    }
    if (media.mime_type?.startsWith("video/")) {
      return <video src={media.file_path} className="w-full h-full object-contain" controls autoPlay muted playsInline />
    }
    if (isGoogleSlides(media)) {
      const embedUrl = getGoogleSlidesEmbedUrl(media.file_path || "")
      return <iframe src={embedUrl} className="w-full h-full border-0" allowFullScreen title={media.name} />
    }
    return (
      <div className="flex items-center justify-center h-full bg-muted">
        <div className="text-center">
          <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Preview not available</p>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full p-0 m-0" style={{ width: "100vw", height: "100vh" }}>
        <DialogTitle className="sr-only">{media.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Preview of {media.mime_type} file, {formatFileSize(media.file_size)}
        </DialogDescription>
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{media.name}</h2>
              <div className="flex items-center gap-2 md:gap-4 text-sm text-white/80 mt-1 flex-wrap">
                <span>{media.mime_type}</span>
                <span>{formatFileSize(media.file_size)}</span>
              </div>
            </div>
            <Button onClick={onClose} variant="ghost" size="sm" className="text-white hover:bg-white/20 border border-white/30 ml-2">
              <X className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Close</span>
            </Button>
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

// Media Action Bottom Sheet for mobile
function MediaActionSheet({
  media,
  isOpen,
  onClose,
  onPreview,
  onEdit,
  onDelete,
}: {
  media: MediaItem | null
  isOpen: boolean
  onClose: () => void
  onPreview: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  if (!media) return null

  return (
    <BottomSheet open={isOpen} onOpenChange={onClose}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <div className="flex items-start gap-4">
            {/* Thumbnail */}
            <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
              {media.mime_type?.startsWith("image/") ? (
                <img src={media.file_path || "/placeholder.svg"} alt={media.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Video className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <BottomSheetTitle className="truncate text-left">{media.name}</BottomSheetTitle>
              <p className="text-sm text-muted-foreground mt-1">{formatFileSize(media.file_size)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{media.mime_type}</p>
              {media.tags && media.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {media.tags.slice(0, 3).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </BottomSheetHeader>

        <BottomSheetFooter>
          <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={onPreview}>
            <Eye className="w-5 h-5" />
            Preview Full Screen
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-12" onClick={onEdit}>
            <Pencil className="w-5 h-5" />
            Edit Details
          </Button>
          <Button variant="outline" className="w-full justify-start gap-3 h-12">
            <ListPlus className="w-5 h-5" />
            Add to Playlist
          </Button>
          <Button variant="destructive" className="w-full justify-start gap-3 h-12" onClick={onDelete}>
            <Trash2 className="w-5 h-5" />
            Delete
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  )
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [importUrl, setImportUrl] = useState("")
  const [importName, setImportName] = useState("")
  const [importTags, setImportTags] = useState("")
  const [importing, setImporting] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; itemId: string; itemName: string }>({
    open: false,
    itemId: "",
    itemName: "",
  })
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null)
  const [editDialog, setEditDialog] = useState<{ open: boolean; item: MediaItem | null }>({ open: false, item: null })
  const [editName, setEditName] = useState("")
  const [editTags, setEditTags] = useState("")
  const [updating, setUpdating] = useState(false)
  const [uploadExpanded, setUploadExpanded] = useState(true)
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const { toast } = useToast()
  const uploadLimits = useUploadLimits()
  const { features, planName } = usePlanLimits()
  const canImportUrl = features?.urlMedia

  useEffect(() => {
    fetchMedia()
  }, [])

  const fetchMedia = async () => {
    try {
      const response = await fetch("/api/media/list")
      if (response.ok) {
        const data = await response.json()
        setMedia(Array.isArray(data.media) ? data.media : [])
      } else if (response.status === 401) {
        toast({ title: "Authentication Required", description: "Please log in to access the media library", variant: "destructive" })
      } else {
        toast({ title: "Error", description: "Failed to fetch media", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch media", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleImportUrl = async () => {
    if (!importUrl) {
      toast({ title: "Error", description: "Please enter a URL", variant: "destructive" })
      return
    }
    if (!features?.urlMedia) {
      toast({ title: "Feature Restricted", description: "URL media import is not available on your current plan.", variant: "destructive" })
      return
    }
    setImporting(true)
    try {
      const response = await fetch("/api/media/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl, name: importName || undefined, tags: importTags || undefined }),
      })
      if (response.ok) {
        const newMedia = await response.json()
        setMedia((prev) => [newMedia, ...prev])
        setImportUrl("")
        setImportName("")
        setImportTags("")
        toast({ title: "Success", description: "Media imported successfully" })
      } else {
        toast({ title: "Error", description: "Import failed", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Import failed", variant: "destructive" })
    } finally {
      setImporting(false)
    }
  }

  const handleDelete = (id: string, name: string) => {
    setSelectedMedia(null) // Close bottom sheet
    setDeleteDialog({ open: true, itemId: id, itemName: name })
  }

  const handleConfirmDelete = async () => {
    const { itemId } = deleteDialog
    try {
      const response = await fetch("/api/media/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      })
      if (response.ok) {
        setMedia((prev) => prev.filter((item) => item.id !== itemId))
        await uploadLimits.refresh()
        toast({ title: "Success", description: "Media deleted successfully" })
      } else {
        toast({ title: "Error", description: "Failed to delete media", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete media", variant: "destructive" })
    } finally {
      setDeleteDialog({ open: false, itemId: "", itemName: "" })
    }
  }

  const handlePreview = (item: MediaItem) => {
    setSelectedMedia(null)
    setPreviewMedia(item)
  }

  const handleEdit = (item: MediaItem) => {
    setSelectedMedia(null)
    setEditDialog({ open: true, item })
    setEditName(item.name)
    setEditTags(item.tags ? item.tags.join(", ") : "")
  }

  const handleConfirmEdit = async () => {
    if (!editDialog.item) return
    setUpdating(true)
    try {
      const response = await fetch("/api/media/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editDialog.item.id,
          name: editName,
          tags: editTags.split(",").map((t) => t.trim()).filter((t) => t.length > 0),
        }),
      })
      if (response.ok) {
        const { media: updatedMedia } = await response.json()
        setMedia((prev) => prev.map((item) => (item.id === updatedMedia.id ? updatedMedia : item)))
        setEditDialog({ open: false, item: null })
        toast({ title: "Success", description: "Media updated successfully" })
      } else {
        toast({ title: "Error", description: "Failed to update media", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to update media", variant: "destructive" })
    } finally {
      setUpdating(false)
    }
  }

  // Handle media card click - on mobile opens bottom sheet, on desktop does nothing (use hover buttons)
  const handleMediaClick = (item: MediaItem) => {
    if (window.innerWidth < 768) {
      setSelectedMedia(item)
    }
  }

  const filteredMedia = media.filter((item) => {
    if (!item || !item.name) return false
    const nameMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase())
    const tagMatch = item.tags?.some((tag) => tag?.toLowerCase().includes(searchTerm.toLowerCase()))
    return nameMatch || tagMatch
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Loading media library...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Media Library</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-0.5">Upload and manage your content</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="flex-1 md:flex-none"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="flex-1 md:flex-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Collapsible Upload Section */}
      <Card>
        <button
          onClick={() => setUploadExpanded(!uploadExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">Add Media</span>
            {!uploadLimits.loading && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {uploadLimits.currentStorageFormatted} / {uploadLimits.maxStorage} {uploadLimits.storageUnit} used
              </span>
            )}
          </div>
          {uploadExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </button>

        {uploadExpanded && (
          <CardContent className="pt-0 space-y-4">
            {!uploadLimits.loading && (
              <StorageUsageBar
                currentFormatted={uploadLimits.currentStorageFormatted}
                maxStorage={uploadLimits.maxStorage}
                storageUnit={uploadLimits.storageUnit}
                usagePercentage={uploadLimits.storageUsagePercentage}
                planName={uploadLimits.planName}
              />
            )}

            <Tabs defaultValue="upload" className="w-full">
              <TabsList className={cn("grid w-full", features?.urlMedia ? "grid-cols-2" : "grid-cols-1")}>
                <TabsTrigger value="upload" className="text-sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </TabsTrigger>
                {features?.urlMedia && (
                  <TabsTrigger value="import" className="text-sm">
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Import URL
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="upload" className="mt-4">
                <SimpleUploader
                  onUploadComplete={async (newMedia) => {
                    setMedia((prev) => [newMedia as MediaItem, ...prev])
                    await uploadLimits.refresh()
                    toast({ title: "Success", description: "File uploaded successfully" })
                  }}
                  onUploadError={(error) => {
                    toast({ title: "Upload Failed", description: error, variant: "destructive" })
                  }}
                  maxFileSizeMB={Math.round(uploadLimits.maxFileSize / (1024 * 1024))}
                />
              </TabsContent>

              <TabsContent value="import" className="mt-4 space-y-3">
                {!canImportUrl ? (
                  <UpgradeBanner feature="Google Slides & YouTube Import" description="Import content directly from Google Slides and YouTube." currentPlan={planName} />
                ) : (
                  <>
                    <Input placeholder="Google Slides or YouTube URL" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder="Name (optional)" value={importName} onChange={(e) => setImportName(e.target.value)} />
                      <Input placeholder="Tags (comma separated)" value={importTags} onChange={(e) => setImportTags(e.target.value)} />
                    </div>
                    <Button onClick={handleImportUrl} disabled={!importUrl || importing} className="w-full sm:w-auto">
                      {importing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Plus className="h-4 w-4 mr-2" />}
                      Import
                    </Button>
                    <p className="text-xs text-muted-foreground">Supported: Google Slides and YouTube. External URLs don&apos;t count toward storage.</p>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search media..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredMedia.length} item{filteredMedia.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Media Grid/List */}
      {filteredMedia.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No media found</h3>
            <p className="text-muted-foreground text-center text-sm">
              {media.length === 0 ? "Upload your first media file to get started" : "No media matches your search"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4" : "space-y-3"}>
          {filteredMedia.map((item) => (
            <Card
              key={item.id}
              className="group cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleMediaClick(item)}
            >
              {viewMode === "grid" ? (
                <div>
                  <div className="aspect-video bg-muted rounded-t-lg overflow-hidden relative">
                    {item.mime_type?.startsWith("image/") ? (
                      <img src={item.file_path || "/placeholder.svg"} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Video className="h-8 md:h-12 w-8 md:w-12 text-muted-foreground" />
                      </div>
                    )}
                    {/* Desktop hover actions */}
                    <div className="absolute top-2 right-2 hidden md:flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handlePreview(item) }} className="bg-white/90 hover:bg-white h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(item) }} className="bg-white/90 hover:bg-white h-8 w-8 p-0">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.name) }} className="h-8 w-8 p-0">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate text-foreground" title={item.name}>{item.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatFileSize(item.file_size)}</p>
                  </CardContent>
                </div>
              ) : (
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-muted rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.mime_type?.startsWith("image/") ? (
                        <img src={item.file_path || "/placeholder.svg"} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Video className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate text-foreground">{item.name}</h3>
                      <p className="text-xs text-muted-foreground">{formatFileSize(item.file_size)}</p>
                    </div>
                    {/* Desktop list actions */}
                    <div className="hidden md:flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handlePreview(item) }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(item) }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.name) }}>
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

      {/* Mobile Action Bottom Sheet */}
      <MediaActionSheet
        media={selectedMedia}
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
        onPreview={() => selectedMedia && handlePreview(selectedMedia)}
        onEdit={() => selectedMedia && handleEdit(selectedMedia)}
        onDelete={() => selectedMedia && handleDelete(selectedMedia.id, selectedMedia.name)}
      />

      {/* Preview Modal */}
      {previewMedia && <MediaPreviewModal media={previewMedia} isOpen={!!previewMedia} onClose={() => setPreviewMedia(null)} />}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title="Delete Media File"
        description={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>Update the name and tags for this media item.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter media name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input id="edit-tags" value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="Enter tags (comma separated)" />
              <p className="text-xs text-muted-foreground">Separate multiple tags with commas</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditDialog({ open: false, item: null })} disabled={updating} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleConfirmEdit} disabled={updating || !editName.trim()} className="w-full sm:w-auto">
              {updating ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
