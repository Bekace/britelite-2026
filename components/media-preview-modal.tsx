"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MediaItem {
  id: string
  name: string
  mime_type: string
  file_size: number
  file_path: string
  tags: string[] | null
  created_at: string
}

interface MediaPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: MediaItem | null
}

export function MediaPreviewModal({ open, onOpenChange, item }: MediaPreviewModalProps) {
  if (!item) return null

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "N/A"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const isImage = item.mime_type?.startsWith("image/")
  const isVideo = item.mime_type?.startsWith("video/")
  const isGoogleSlides =
    item.mime_type === "application/vnd.google-apps.presentation" ||
    item.mime_type?.includes("presentation") ||
    item.name?.includes("slides") ||
    item.file_path?.includes("docs.google.com")

  const renderMediaContent = () => {
    if (isImage) {
      return <img src={item.file_path || "/placeholder.svg"} alt={item.name} className="w-full h-full object-contain" />
    }

    if (isVideo) {
      return (
        <video src={item.file_path} controls className="w-full h-full" preload="metadata">
          Your browser does not support the video tag.
        </video>
      )
    }

    if (isGoogleSlides) {
      // Convert Google Slides URL to embed format
      let embedUrl = item.file_path
      if (embedUrl.includes("/edit")) {
        embedUrl = embedUrl.replace("/edit", "/embed")
      }
      if (!embedUrl.includes("/embed")) {
        embedUrl = embedUrl + "/embed"
      }

      return <iframe src={embedUrl} className="w-full h-full border-0" allowFullScreen title={item.name} />
    }

    // Fallback for other file types
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-gray-600">Preview not available for this file type</p>
          <p className="text-sm text-gray-500 mt-2">{item.mime_type}</p>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-semibold truncate pr-4">{item.name}</DialogTitle>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span>{formatFileSize(item.file_size)}</span>
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{item.mime_type}</span>
              </div>
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {item.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 px-6 pb-6">
          <div className="w-full h-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
            {renderMediaContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
