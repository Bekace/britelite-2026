"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import "@/components/ui/spinner.css"

interface MediaItem {
  id: string
  position: number
  duration_override: number | null
  transition_type: string | null
  transition_duration: number | null
  media: {
    id: string
    name: string
    file_path: string
    mime_type: string
    file_size: number
    duration: number | null
    media_type: string
  }
}

interface ScreenConfig {
  device: {
    id: string
    code: string
    name: string
    orientation: string
    resolution: string
  }
  screen: {
    id: string
    name: string
    content: MediaItem[]
    playlist: {
      id: string
      name: string
      background_color: string
      scale_image?: string
      scale_video?: string
      scale_document?: string
      shuffle?: boolean
      default_transition?: string
      shuffle_content?: boolean
    } | null
    updated_at: string
  }
}

interface PlayerPageProps {
  params: { deviceCode: string }
}

const getMediaUrl = (filePath: string) => {
  if (!filePath) return "/placeholder.svg"
  if (filePath.startsWith("http")) return filePath
  return filePath
}

const isGoogleSlides = (media: MediaItem["media"]) => {
  return (
    media.mime_type === "application/vnd.google-apps.presentation" ||
    media.name.toLowerCase().includes("google slides") ||
    media.file_path.includes("docs.google.com/presentation")
  )
}

const isYouTubeVideo = (media: MediaItem["media"]) => {
  return (
    media.mime_type === "video/youtube" ||
    media.file_path.includes("youtube.com") ||
    media.file_path.includes("youtu.be") ||
    media.file_path.includes("youtube-nocookie.com")
  )
}

const getYouTubeUrlWithAutoplay = (url: string) => {
  try {
    let embedUrl = url

    if (url.includes("youtube.com/watch")) {
      const urlObj = new URL(url)
      const videoId = urlObj.searchParams.get("v")
      if (videoId) {
        embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`
      }
    } else if (url.includes("youtu.be/")) {
      const videoId = url.split("youtu.be/")[1]?.split("?")[0]
      if (videoId) {
        embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`
      }
    } else if (url.includes("youtube.com/embed/")) {
      embedUrl = url.replace("youtube.com", "youtube-nocookie.com")
    }

    const urlObj = new URL(embedUrl)
    urlObj.searchParams.set("autoplay", "1")
    urlObj.searchParams.set("mute", "1")
    urlObj.searchParams.set("controls", "0")
    urlObj.searchParams.set("showinfo", "0")
    urlObj.searchParams.set("fs", "0")
    urlObj.searchParams.set("modestbranding", "1")
    urlObj.searchParams.set("iv_load_policy", "3")
    return urlObj.toString()
  } catch (error) {
    console.error("[v0] Error parsing YouTube URL:", error)
    return url
  }
}

const getMediaObjectFit = (mediaType: "image" | "video" | "document", playlist: any) => {
  if (!playlist) return "object-contain"

  let scaleValue = "fit"
  switch (mediaType) {
    case "image":
      scaleValue = playlist.scale_image || "fit"
      break
    case "video":
      scaleValue = playlist.scale_video || "fit"
      break
    case "document":
      scaleValue = playlist.scale_document || "fit"
      break
  }

  switch (scaleValue) {
    case "fill":
      return "object-cover"
    case "stretch":
      return "object-fill"
    case "center":
      return "object-none"
    case "fit":
    default:
      return "object-contain"
  }
}

export default function PlayerPage({ params }: PlayerPageProps) {
  const [config, setConfig] = useState<ScreenConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(10)
  const [shuffledContent, setShuffledContent] = useState<MediaItem[]>([])
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const youtubePlayerRef = useRef<any>(null)

  const onYouTubeIframeAPIReady = (iframeId: string) => {
    if (typeof window !== "undefined" && (window as any).YT && (window as any).YT.Player) {
      try {
        youtubePlayerRef.current = new (window as any).YT.Player(iframeId, {
          events: {
            onReady: (event: any) => {
              event.target.playVideo()
            },
          },
        })
      } catch (e) {
        console.error("[v0] Error initializing YouTube player:", e)
      }
    }
  }

  const contentToDisplay = shuffledContent.length > 0 ? shuffledContent : config?.screen.content || []
  const currentMedia = contentToDisplay[currentIndex]

  const goToNext = useCallback(() => {
    console.log("[v0] goToNext called, currentIndex:", currentIndex, "total items:", contentToDisplay.length)

    if (contentToDisplay.length === 0) {
      console.log("[v0] No items to advance to")
      return
    }

    const nextIndex = currentIndex + 1 < contentToDisplay.length ? currentIndex + 1 : 0

    console.log("[v0] Moving to next item, index:", nextIndex)
    setCurrentIndex(nextIndex)

    const nextItem = contentToDisplay[nextIndex]
    const duration = nextItem?.duration_override || nextItem?.media.duration || 10
    setTimeRemaining(duration)
  }, [currentIndex, contentToDisplay])

  useEffect(() => {
    if (isPlaying && timeRemaining > 0 && currentMedia) {
      const timer = setTimeout(() => {
        setTimeRemaining((prev) => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (isPlaying && timeRemaining === 0) {
      console.log("[v0] Timer finished, calling goToNext")
      goToNext()
    }
  }, [isPlaying, timeRemaining, goToNext, currentMedia])

  useEffect(() => {
    if (currentMedia) {
      const duration = currentMedia.duration_override || currentMedia.media.duration || 10
      setTimeRemaining(duration)
    }
  }, [currentMedia])

  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }
  }, [])

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{
        backgroundColor: config?.screen.playlist?.background_color || "#000000",
      }}
    >
      {contentToDisplay && contentToDisplay.length > 0 ? (
        <div className="w-full h-full flex items-center justify-center">
          {currentMedia && (
            <div className="w-full h-full relative">
              {isGoogleSlides(currentMedia.media) ? (
                <iframe
                  key={currentMedia.id}
                  src={currentMedia.media.file_path}
                  className="w-full h-full border-0"
                  allow="autoplay"
                  title={currentMedia.media.name}
                />
              ) : isYouTubeVideo(currentMedia.media) ? (
                <iframe
                  key={currentMedia.id}
                  id={`youtube-player-${currentMedia.id}`}
                  src={getYouTubeUrlWithAutoplay(currentMedia.media.file_path)}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  title={currentMedia.media.name}
                  onLoad={() => {
                    setTimeout(() => {
                      onYouTubeIframeAPIReady(`youtube-player-${currentMedia.id}`)
                    }, 1000)
                  }}
                />
              ) : currentMedia.media.mime_type.startsWith("video/") ? (
                <video
                  ref={videoRef}
                  key={currentMedia.id}
                  src={getMediaUrl(currentMedia.media.file_path)}
                  className={`w-full h-full ${getMediaObjectFit("video", config?.screen.playlist)}`}
                  autoPlay
                  muted
                  playsInline
                  onEnded={goToNext}
                />
              ) : currentMedia.media.mime_type.startsWith("image/") ? (
                <Image
                  src={getMediaUrl(currentMedia.media.file_path) || "/placeholder.svg"}
                  alt={currentMedia.media.name}
                  fill
                  className={getMediaObjectFit("image", config?.screen.playlist)}
                  priority
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <p className="text-2xl">{currentMedia.media.name}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0a2a3a] text-white">
          <div className="text-center space-y-4">
            <div className="text-6xl">📺</div>
            <h2 className="text-3xl font-light">No content assigned</h2>
            <p className="text-xl text-gray-400">Assign content to this screen in your dashboard</p>
          </div>
        </div>
      )}
    </div>
  )
}
