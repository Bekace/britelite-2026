"use client"

import { useState, useEffect, useCallback } from "react"

interface UploadLimits {
  maxStorage: number
  storageUnit: string
  currentStorageBytes: number
  currentStorageFormatted: number
  remainingStorageFormatted: number
  isAtLimit: boolean
  canUpload: (fileSizeBytes: number) => boolean
  storageUsagePercentage: number
  isUnlimited: boolean
  maxFileSize: number
}

export function useUploadLimits(): UploadLimits & {
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const [limits, setLimits] = useState<UploadLimits>({
    maxStorage: 100,
    storageUnit: "MB",
    currentStorageBytes: 0,
    currentStorageFormatted: 0,
    remainingStorageFormatted: 100,
    isAtLimit: false,
    canUpload: () => false,
    storageUsagePercentage: 0,
    isUnlimited: false,
    maxFileSize: 52428800, // 50MB default
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUploadLimits = useCallback(async () => {
    try {
      const response = await fetch("/api/upload-limits")
      if (response.ok) {
        const data = await response.json()

        const isUnlimited = data.maxStorage === -1
        const storageUnit = data.storageUnit || "MB"
        const currentStorageBytes = data.currentStorageBytes || 0
        const maxStorageBytes = data.maxStorage // API already returns bytes, don't multiply
        const maxFileSize = data.maxFileSize || 52428800 // Default to 50MB

        const bytesPerUnit =
          storageUnit === "GB" ? 1024 * 1024 * 1024 : storageUnit === "TB" ? 1024 * 1024 * 1024 * 1024 : 1024 * 1024 // MB default

        const currentStorageFormatted = currentStorageBytes / bytesPerUnit
        const maxStorageFormatted = isUnlimited ? Number.MAX_SAFE_INTEGER : maxStorageBytes / bytesPerUnit
        const remainingStorageFormatted = isUnlimited
          ? Number.MAX_SAFE_INTEGER
          : Math.max(0, maxStorageFormatted - currentStorageFormatted)
        const storageUsagePercentage = isUnlimited ? 0 : (currentStorageFormatted / maxStorageFormatted) * 100

        setLimits({
          maxStorage: maxStorageBytes,
          storageUnit,
          currentStorageBytes,
          currentStorageFormatted,
          remainingStorageFormatted,
          isAtLimit: !isUnlimited && currentStorageBytes >= maxStorageBytes,
          canUpload: (fileSizeBytes: number) => {
            if (isUnlimited) return fileSizeBytes <= maxFileSize
            return fileSizeBytes <= maxFileSize && currentStorageBytes + fileSizeBytes <= maxStorageBytes
          },
          storageUsagePercentage: Math.min(100, storageUsagePercentage),
          isUnlimited,
          maxFileSize,
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
  }, [])

  useEffect(() => {
    fetchUploadLimits()
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchUploadLimits()
  }, [])

  return { ...limits, loading, error, refresh }
}
