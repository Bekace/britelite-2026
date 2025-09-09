"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"

interface FeatureLimits {
  maxScreens: number
  maxPlaylists: number
  maxMediaAssets: number
  maxStorageMB: number
}

interface UsageStats {
  currentScreens: number
  currentPlaylists: number
  currentMedia: number
  currentStorageMB: number
}

interface FeatureLimitsContextType {
  limits: FeatureLimits | null
  usage: UsageStats | null
  loading: boolean
  canCreateScreen: boolean
  canCreatePlaylist: boolean
  canUploadMedia: (fileSizeMB: number) => boolean
  refreshUsage: () => Promise<void>
}

const FeatureLimitsContext = createContext<FeatureLimitsContextType | undefined>(undefined)

export function FeatureLimitsProvider({ children }: { children: React.ReactNode }) {
  const [limits, setLimits] = useState<FeatureLimits | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const fetchLimitsAndUsage = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Get user's current subscription and limits
      const { data: subscription } = await supabase
        .from("user_subscriptions")
        .select(`
          subscription_plans (
            max_screens,
            max_media_storage,
            features
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      // Get user's current usage
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_screens_count, current_playlists_count, current_media_count, current_storage_used_mb")
        .eq("id", user.id)
        .single()

      if (subscription?.subscription_plans && profile) {
        const plan = subscription.subscription_plans
        const features = (plan.features as any) || {}

        setLimits({
          maxScreens: plan.max_screens || 0,
          maxPlaylists: features.max_playlists || 0,
          maxMediaAssets: features.max_media_assets || 0,
          maxStorageMB: Math.floor((plan.max_media_storage || 0) / (1024 * 1024)),
        })

        setUsage({
          currentScreens: profile.current_screens_count || 0,
          currentPlaylists: profile.current_playlists_count || 0,
          currentMedia: profile.current_media_count || 0,
          currentStorageMB: profile.current_storage_used_mb || 0,
        })
      }
    } catch (error) {
      console.error("Error fetching feature limits:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLimitsAndUsage()
  }, [])

  const canCreateScreen = limits && usage ? usage.currentScreens < limits.maxScreens : false
  const canCreatePlaylist = limits && usage ? usage.currentPlaylists < limits.maxPlaylists : false

  const canUploadMedia = (fileSizeMB: number) => {
    if (!limits || !usage) return false
    return usage.currentMedia < limits.maxMediaAssets && usage.currentStorageMB + fileSizeMB <= limits.maxStorageMB
  }

  return (
    <FeatureLimitsContext.Provider
      value={{
        limits,
        usage,
        loading,
        canCreateScreen,
        canCreatePlaylist,
        canUploadMedia,
        refreshUsage: fetchLimitsAndUsage,
      }}
    >
      {children}
    </FeatureLimitsContext.Provider>
  )
}

export function useFeatureLimits() {
  const context = useContext(FeatureLimitsContext)
  if (context === undefined) {
    throw new Error("useFeatureLimits must be used within a FeatureLimitsProvider")
  }
  return context
}
