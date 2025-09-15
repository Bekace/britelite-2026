"use client"

import { useState, useEffect } from "react"

interface UploadLimits {
  maxStorageGB: number
  currentStorageGB: number
  remainingStorageGB: number
  isAtLimit: boolean
  canUpload: (fileSizeBytes: number) => boolean
  storageUsagePercentage: number
}

export function useUploadLimits(): UploadLimits & { loading: boolean; error: string | null } {
  const [limits, setLimits] = useState<UploadLimits>({
    maxStorageGB: 1, // Default to Free plan
    currentStorageGB: 0,
    remainingStorageGB: 1,
    isAtLimit: false,
    canUpload: () => false,
    storageUsagePercentage: 0,
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

        const maxStorageBytes = data.maxStorageGB * 1024 * 1024 * 1024 // Convert GB to bytes
        const currentStorageBytes = data.currentStorageBytes || 0
        const currentStorageGB = currentStorageBytes / (1024 * 1024 * 1024)
        const remainingStorageGB = Math.max(0, data.maxStorageGB - currentStorageGB)
        const storageUsagePercentage = (currentStorageGB / data.maxStorageGB) * 100

        setLimits({
          maxStorageGB: data.maxStorageGB,
          currentStorageGB,
          remainingStorageGB,
          isAtLimit: currentStorageBytes >= maxStorageBytes,
          canUpload: (fileSizeBytes: number) => {
            return currentStorageBytes + fileSizeBytes <= maxStorageBytes
          },
          storageUsagePercentage: Math.min(100, storageUsagePercentage),
        })
        setError(null)
      } else {
        setError("Failed to fetch upload limits")
      }
    } catch (err) {
      setError("Failed to fetch upload limits")
      console.error("Upload limits error:", err)
    } finally {
      setLoading(false)
    }
  }

  return { ...limits, loading, error }
}
