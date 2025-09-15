"use client"

import { useState, useEffect } from "react"

interface UploadLimits {
  maxStorageGB: number
  currentStorageGB: number
  remainingStorageGB: number
  isAtLimit: boolean
  canUpload: (fileSizeBytes: number) => boolean
  storageUsagePercentage: number
  isUnlimited: boolean
}

export function useUploadLimits(): UploadLimits & { loading: boolean; error: string | null } {
  const [limits, setLimits] = useState<UploadLimits>({
    maxStorageGB: 1, // Default to Free plan
    currentStorageGB: 0,
    remainingStorageGB: 1,
    isAtLimit: false,
    canUpload: () => false,
    storageUsagePercentage: 0,
    isUnlimited: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchUploadLimits()
  }, [])

  const fetchUploadLimits = async () => {
    try {
      const response = await fetch("/api/upload-limits")
      if (response.ok) {
        const data = await response.json()

        const isUnlimited = data.maxStorageGB === -1
        const maxStorageBytes = isUnlimited ? Number.MAX_SAFE_INTEGER : data.maxStorageGB * 1024 * 1024 * 1024
        const currentStorageBytes = data.currentStorageBytes || 0
        const currentStorageGB = currentStorageBytes / (1024 * 1024 * 1024)
        const remainingStorageGB = isUnlimited
          ? Number.MAX_SAFE_INTEGER
          : Math.max(0, data.maxStorageGB - currentStorageGB)
        const storageUsagePercentage = isUnlimited ? 0 : (currentStorageGB / data.maxStorageGB) * 100

        setLimits({
          maxStorageGB: data.maxStorageGB,
          currentStorageGB,
          remainingStorageGB,
          isAtLimit: !isUnlimited && currentStorageBytes >= maxStorageBytes,
          canUpload: (fileSizeBytes: number) => {
            if (isUnlimited) return true
            return currentStorageBytes + fileSizeBytes <= maxStorageBytes
          },
          storageUsagePercentage: Math.min(100, storageUsagePercentage),
          isUnlimited,
        })
        setError(null)
      } else {
        setError("Failed to fetch upload limits")
      }
    } catch (err) {
      setError("Failed to fetch upload limits")
    } finally {
      setLoading(false)
    }
  }

  return { ...limits, loading, error }
}
