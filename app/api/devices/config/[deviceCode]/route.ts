import { createClient } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

// Función para procesar URLs de Google Slides - añade parámetro rm=minimal para ocultar controles
function processGoogleSlidesUrl(filePath: string): string {
  if (!filePath) return filePath
  
  // Detectar si es una URL de Google Slides
  if (filePath.includes("docs.google.com/presentation")) {
    // Si ya tiene el parámetro rm=minimal, no agregarlo de nuevo
    if (filePath.includes("rm=minimal")) {
      return filePath
    }
    
    // Agregar el parámetro rm=minimal al final de la URL
    return filePath.includes("?") 
      ? `${filePath}&rm=minimal`
      : `${filePath}?rm=minimal`
  }
  
  return filePath
}

export async function GET(request: NextRequest, { params }: { params: { deviceCode: string } }) {
  try {
    const { deviceCode } = params

    console.log("[v0] Device config API called for:", deviceCode)

    if (!deviceCode) {
      return NextResponse.json({ error: "Device code is required" }, { status: 400 })
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_code", deviceCode)
      .maybeSingle()

    console.log("[v0] Device lookup result:", { device, deviceError })

    if (deviceError || !device) {
      console.log("[v0] Device not found for code:", deviceCode)
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    if (!device.screen_id) {
      console.log("[v0] Device not paired to screen:", deviceCode)
      return NextResponse.json({ error: "Device not paired to screen" }, { status: 404 })
    }

    const { data: screen, error: screenError } = await supabase
      .from("screens")
      .select("id, user_id, name, orientation, status, media_id, content_type, enable_audio_management, shuffle, is_active, scale_image, scale_video, scale_document, background_color, default_transition, timezone")
      .eq("id", device.screen_id)
      .single()

    console.log("[v0] Screen lookup result:", { screen, screenError })

    console.log("[v0] Screen details - media_id:", screen?.media_id, "content_type:", screen?.content_type)

    if (screenError || !screen) {
      return NextResponse.json({ error: "Screen not found" }, { status: 404 })
    }

    // Fetch user's subscription plan with display_branding setting
    let displayBranding = false
    if (screen.user_id) {
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select("plan_id")
        .eq("user_id", screen.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (subscription?.plan_id) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("display_branding")
          .eq("id", subscription.plan_id)
          .single()

        displayBranding = plan?.display_branding ?? false
      }
    }

    let playlistContent = []
    let activePlaylist = null

    if (screen.content_type === "asset") {
      console.log("[v0] Checking screen_media for multiple assets for screen:", screen.id)

      const { data: screenMedia, error: mediaError } = await supabase
        .from("screen_media")
        .select(`
          id,
          media (
            id,
            name,
            file_path,
            mime_type,
            file_size,
            duration
          )
        `)
        .eq("screen_id", screen.id)

      console.log("[v0] Screen media lookup:", { count: screenMedia?.length, mediaError })

      if (!mediaError && screenMedia && screenMedia.length > 0) {
        playlistContent = screenMedia
          .filter((sm) => sm.media)
          .map((sm, index) => ({
            id: `asset-${sm.media.id}`,
            position: index + 1,
            duration_override: null,
            transition_type: null,
            transition_duration: null,
            media: sm.media,
          }))

        // Create a virtual playlist for multiple assets display
        activePlaylist = {
          id: `asset-playlist-${screen.id}`,
          name: `Assets for ${screen.name}`,
          is_active: true,
        }

        console.log("[v0] Loaded multiple assets from screen_media:", playlistContent.length)
      } else if (screen.media_id) {
        // Fallback to legacy single media_id if screen_media is empty
        console.log("[v0] No screen_media entries, falling back to legacy media_id:", screen.media_id)

        const { data: mediaItem, error: singleMediaError } = await supabase
          .from("media")
          .select("id, name, file_path, mime_type, file_size, duration")
          .eq("id", screen.media_id)
          .single()

        console.log("[v0] Legacy media item lookup:", { mediaItem, singleMediaError })

        if (!singleMediaError && mediaItem) {
          playlistContent = [
            {
              id: `asset-${mediaItem.id}`,
              position: 1,
              duration_override: null,
              transition_type: null,
              transition_duration: null,
              media: mediaItem,
            },
          ]

          activePlaylist = {
            id: `asset-playlist-${screen.id}`,
            name: `Asset: ${mediaItem.name}`,
            is_active: true,
          }
        }
      }
    }
    // If content type is schedule, check for active schedule
    else if (screen.content_type === "schedule") {
      console.log("[v0] Content type is schedule, checking for active schedule for screen:", screen.id)

      const { data: screenSchedule, error: scheduleError } = await supabase
        .from("screen_schedules")
        .select(`
          schedule_id,
          schedules!screen_schedules_schedule_id_fkey (
            id,
            name,
            is_active,
            default_content_type,
            default_content_id
          )
        `)
        .eq("screen_id", screen.id)
        .maybeSingle()

      console.log("[v0] Screen schedule lookup:", { screenSchedule, scheduleError })

      // schedules join may return array or object depending on Supabase version — normalise to object
      const rawSchedules = screenSchedule?.schedules
      const scheduleData = Array.isArray(rawSchedules) ? rawSchedules[0] : rawSchedules

      if (scheduleData) {
        console.log("[v0] Active schedule found:", {
          scheduleId: scheduleData.id,
          scheduleName: scheduleData.name,
        })

        // Fetch schedule items using correct column names (content_id + content_type)
        const { data: scheduleItems, error: scheduleItemsError } = await supabase
          .from("schedule_items")
          .select(`
            id,
            start_time,
            end_time,
            days_of_week,
            recurrence_type,
            content_id,
            content_type
          `)
          .eq("schedule_id", scheduleData.id)

        console.log("[v0] Schedule items lookup:", { count: scheduleItems?.length, scheduleItemsError })

        if (!scheduleItemsError && scheduleItems && scheduleItems.length > 0) {
          // Use the screen's configured timezone to evaluate schedule time windows.
          const screenTimezone = screen.timezone || "UTC"
          const now = new Date()

          // Reliably extract day-of-week (0=Sun…6=Sat) using Intl.DateTimeFormat parts
          const dateParts = new Intl.DateTimeFormat("en-US", {
            timeZone: screenTimezone,
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }).formatToParts(now)

          const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
          const weekdayPart = dateParts.find((p) => p.type === "weekday")?.value ?? ""
          const currentDay = dayMap[weekdayPart] ?? now.getDay()

          const h = dateParts.find((p) => p.type === "hour")?.value?.padStart(2, "0") ?? "00"
          const m = dateParts.find((p) => p.type === "minute")?.value?.padStart(2, "0") ?? "00"
          const s = dateParts.find((p) => p.type === "second")?.value?.padStart(2, "0") ?? "00"
          const currentTime = `${h}:${m}:${s}`

          console.log("[v0] Schedule time check — timezone:", screenTimezone, "day:", currentDay, "time:", currentTime)

          const itemMatchesDay = (item: typeof scheduleItems[0]) => {
            if (item.recurrence_type === "daily") return true
            if (!item.days_of_week || !Array.isArray(item.days_of_week) || item.days_of_week.length === 0) return true
            return item.days_of_week.includes(currentDay)
          }

          const itemMatchesTime = (item: typeof scheduleItems[0]) => {
            if (!item.start_time || !item.end_time) return true
            return currentTime >= item.start_time && currentTime <= item.end_time
          }

          // Find the best matching item: day + time window
          const activeScheduleItem = scheduleItems.find(
            (item) => itemMatchesDay(item) && itemMatchesTime(item)
          )

          console.log("[v0] Active schedule item:", activeScheduleItem?.id ?? "none")

          if (activeScheduleItem) {
            const { content_id, content_type } = activeScheduleItem

            if (content_type === "playlist" && content_id) {
              // Load playlist and its items
              const { data: playlistData } = await supabase
                .from("playlists")
                .select("id, name, is_active")
                .eq("id", content_id)
                .single()

              if (playlistData) {
                activePlaylist = playlistData

                const { data: playlistItems, error: itemsError } = await supabase
                  .from("playlist_items")
                  .select(`
                    id,
                    position,
                    duration_override,
                    transition_type,
                    transition_duration,
                    content_type,
                    menu_scene_id,
                    media (
                      id,
                      name,
                      file_path,
                      mime_type,
                      file_size,
                      duration
                    ),
                    menu_scene:menu_scenes(
                      id,
                      name,
                      orientation,
                      menu:restaurant_menus(
                        id,
                        name,
                        brand_settings,
                        menu_template:menu_templates(id, name, layout_config, orientation),
                        menu_sections(*, menu_items(*))
                      )
                    )
                  `)
                  .eq("playlist_id", content_id)
                  .order("position")

                if (!itemsError && playlistItems) {
                  playlistContent = playlistItems.filter((item) => item.media || item.menu_scene)
                }
              }
            } else if (content_type === "media" && content_id) {
              // Load single media asset directly
              const { data: mediaItem } = await supabase
                .from("media")
                .select("id, name, file_path, mime_type, file_size, duration")
                .eq("id", content_id)
                .single()

              if (mediaItem) {
                activePlaylist = {
                  id: `schedule-media-${mediaItem.id}`,
                  name: mediaItem.name,
                  is_active: true,
                }
                playlistContent = [
                  {
                    id: `schedule-asset-${mediaItem.id}`,
                    position: 1,
                    duration_override: null,
                    transition_type: null,
                    transition_duration: null,
                    media: mediaItem,
                  },
                ]
              }
            }
          } else {
            // No schedule item matches — fall back to the schedule's default content
            console.log("[v0] No active schedule item — loading schedule default content")
            const { default_content_type, default_content_id } = scheduleData as any

            if (default_content_type === "playlist" && default_content_id) {
              const { data: defaultPlaylist } = await supabase
                .from("playlists")
                .select("id, name, is_active")
                .eq("id", default_content_id)
                .single()

              if (defaultPlaylist) {
                activePlaylist = defaultPlaylist
                const { data: defaultItems } = await supabase
                  .from("playlist_items")
                  .select(`
                    id, position, duration_override, transition_type, transition_duration,
                    content_type, menu_scene_id,
                    media ( id, name, file_path, mime_type, file_size, duration ),
                    menu_scene:menu_scenes(
                      id, name, orientation,
                      menu:restaurant_menus(
                        id, name, brand_settings,
                        menu_template:menu_templates(id, name, layout_config, orientation),
                        menu_sections(*, menu_items(*))
                      )
                    )
                  `)
                  .eq("playlist_id", default_content_id)
                  .order("position")

                if (defaultItems) {
                  playlistContent = defaultItems.filter((item) => item.media || item.menu_scene)
                }
              }
            } else if (default_content_type === "media" && default_content_id) {
              const { data: defaultMedia } = await supabase
                .from("media")
                .select("id, name, file_path, mime_type, file_size, duration")
                .eq("id", default_content_id)
                .single()

              if (defaultMedia) {
                activePlaylist = { id: `schedule-default-${defaultMedia.id}`, name: defaultMedia.name, is_active: true }
                playlistContent = [{
                  id: `schedule-default-asset-${defaultMedia.id}`,
                  position: 1,
                  duration_override: null,
                  transition_type: null,
                  transition_duration: null,
                  media: defaultMedia,
                }]
              }
            }
          }
        }
      } else {
        console.log("[v0] No schedule linked to screen")
      }
    }
    // If content type is playlist, check for active playlist
    else if (screen.content_type === "playlist" || !screen.content_type) {
      console.log("[v0] Content type is playlist, checking for active playlist for screen:", screen.id)

      const { data: screenPlaylist, error: playlistError } = await supabase
        .from("screen_playlists")
        .select(`
          playlist_id,
          playlists!screen_playlists_playlist_id_fkey (
            id,
            name,
            is_active
          )
        `)
        .eq("screen_id", screen.id)
        .eq("is_active", true)
        .maybeSingle()

      console.log("[v0] Screen playlist lookup:", { screenPlaylist, playlistError })

      const playlistData = screenPlaylist?.playlists

      if (playlistData) {
        activePlaylist = playlistData

        console.log("[v0] Active playlist found:", {
          playlistId: activePlaylist.id,
          playlistName: activePlaylist.name,
        })

        console.log("[v0] Found active playlist, fetching items for playlist_id:", activePlaylist.id)

        const { data: playlistItems, error: itemsError } = await supabase
          .from("playlist_items")
          .select(`
            id,
            position,
            duration_override,
            transition_type,
            transition_duration,
            content_type,
            menu_scene_id,
            media (
              id,
              name,
              file_path,
              mime_type,
              file_size,
              duration
            ),
            menu_scene:menu_scenes(
              id,
              name,
              orientation,
              menu:restaurant_menus(
                id,
                name,
                brand_settings,
                menu_template:menu_templates(id, name, layout_config, orientation),
                menu_sections(*, menu_items(*))
              )
            )
          `)
          .eq("playlist_id", activePlaylist.id)
          .order("position")

        console.log("[v0] Playlist items lookup:", {
          itemsCount: playlistItems?.length,
          itemsError,
          items: playlistItems,
        })

        if (!itemsError && playlistItems) {
          // Include both media items and menu_scene items
          playlistContent = playlistItems.filter((item) => item.media || item.menu_scene)
          console.log("[v0] Filtered playlist content count:", playlistContent.length)
        }
      } else {
        console.log("[v0] No active playlist found for screen")
      }
    }

    await supabase
      .from("devices")
      .update({
        is_paired: true,
        last_heartbeat: new Date().toISOString(),
      })
      .eq("id", device.id)

    console.log("[v0] Device config response:", {
      deviceId: device.id,
      screenId: screen.id,
      contentCount: playlistContent.length,
      hasPlaylist: !!activePlaylist,
      playlistId: activePlaylist?.id,
    })

    // Transform content for Android app - match old API structure exactly
    // Now also supports menu_scene content type
    const transformedContent = playlistContent
      .filter((item: any) => item.media || item.menu_scene) // Include media and menu scenes
      .map((item: any) => {
        const contentType = item.content_type || "media"
        
        if (contentType === "menu_scene" && item.menu_scene) {
          const scene = item.menu_scene
          const menu = scene.menu
          return {
            id: item.id,
            position: item.position,
            duration_override: item.duration_override,
            transition_type: item.transition_type,
            transition_duration: item.transition_duration,
            content_type: "menu_scene",
            menu_scene: {
              id: scene.id,
              name: scene.name,
              orientation: scene.orientation,
              menu: menu ? {
                id: menu.id,
                name: menu.name,
                brand_settings: menu.brand_settings,
                template: menu.menu_template,
                sections: menu.menu_sections?.map((section: any) => ({
                  ...section,
                  items: section.menu_items || [],
                })) || [],
              } : null,
            },
          }
        }
        
        // Default: media content
        const mediaData = item.media
        return {
          id: item.id,
          position: item.position,
          duration_override: item.duration_override,
          transition_type: item.transition_type,
          transition_duration: item.transition_duration,
          content_type: "media",
          media: {
            id: mediaData.id,
            name: mediaData.name,
            duration: mediaData.duration,
            file_path: processGoogleSlidesUrl(mediaData.file_path),
            file_size: mediaData.file_size,
            mime_type: mediaData.mime_type,
          }
        }
      })

    // Add screen-level display settings to playlist object for Android app compatibility
    const playlistWithSettings = activePlaylist ? {
      ...activePlaylist,
      background_color: screen.background_color || "#000000",
      scale_image: screen.scale_image || "fit",
      scale_video: screen.scale_video || "fit",
      scale_document: screen.scale_document || "fit",
      shuffle: screen.shuffle ?? false,
      default_transition: screen.default_transition || "fade",
    } : null

    const responseData = {
      device: {
        id: device.id,
        device_code: device.device_code,
        is_paired: true,
        screen_id: device.screen_id,
        displayBranding: displayBranding,
      },
      screen: {
        id: screen.id,
        name: screen.name,
        orientation: screen.orientation,
        status: screen.status,
        enable_audio_management: screen.enable_audio_management ?? false,
        shuffle: screen.shuffle ?? false,
        is_active: screen.is_active ?? true,
        scale_image: screen.scale_image || "fit",
        scale_video: screen.scale_video || "fit",
        scale_document: screen.scale_document || "fit",
        background_color: screen.background_color || "#000000",
        default_transition: screen.default_transition || "fade",
        playlist: playlistWithSettings,
      },
      content: transformedContent,
    }

    const response = NextResponse.json(responseData)
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")

    return response
  } catch (error) {
    console.error("Device config error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
