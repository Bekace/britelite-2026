"use client"

import { useState, useEffect } from "react"

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
}

export function useUploadLimits(): UploadLimits & { loading: boolean; error: string | null } {
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

        const isUnlimited = data.maxStorage === -1
        const storageUnit = data.storageUnit || "MB"
        const currentStorageBytes = data.currentStorageBytes || 0

        const bytesPerUnit = storageUnit === "GB" ? 1024 * 1024 * 1024 : 1024 * 1024
        const currentStorageFormatted = currentStorageBytes / bytesPerUnit
        const maxStorageBytes = isUnlimited ? Number.MAX_SAFE_INTEGER : data.maxStorage * bytesPerUnit
        const remainingStorageFormatted = isUnlimited
          ? Number.MAX_SAFE_INTEGER
          : Math.max(0, data.maxStorage - currentStorageFormatted)
        const storageUsagePercentage = isUnlimited ? 0 : (currentStorageFormatted / data.maxStorage) * 100

        setLimits({
          maxStorage: data.maxStorage,
          storageUnit,
          currentStorageBytes,
          currentStorageFormatted,
          remainingStorageFormatted,
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
