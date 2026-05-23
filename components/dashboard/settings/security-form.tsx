"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { Shield, Smartphone } from "lucide-react"

interface SecurityFormProps {
  userEmail: string
}

export function SecurityForm({ userEmail }: SecurityFormProps) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." })
      return
    }

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." })
      return
    }

    setSaving(true)
    setMessage(null)

    // Verify current password + update via server-side API to avoid client-side
    // signInWithPassword triggering a session refresh that unmounts the component
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    const data = await response.json()

    if (!response.ok) {
      setMessage({ type: "error", text: data.error || "Failed to update password." })
    } else {
      setMessage({ type: "success", text: "Password updated successfully." })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }

    setSaving(false)
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Password Section */}
      <div className="rounded-lg border border-border/50 p-4 lg:p-6">
        <h2 className="text-base lg:text-lg font-semibold mb-1 lg:mb-2">Change Password</h2>
        <p className="text-xs lg:text-sm text-muted-foreground mb-3 lg:mb-4">Update your password to keep your account secure.</p>

        <div className="space-y-3 lg:space-y-4 w-full lg:max-w-md">
          <div>
            <label className="text-xs lg:text-sm font-medium mb-1.5 lg:mb-2 block">Current Password</label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-muted/30 text-sm"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="text-xs lg:text-sm font-medium mb-1.5 lg:mb-2 block">New Password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-muted/30 text-sm"
              placeholder="Enter new password"
            />
          </div>
          <div>
            <label className="text-xs lg:text-sm font-medium mb-1.5 lg:mb-2 block">Confirm New Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-muted/30 text-sm"
              placeholder="Confirm new password"
            />
          </div>
        </div>

        {message && (
          <p className={`text-xs lg:text-sm mt-3 lg:mt-4 ${message.type === "error" ? "text-destructive" : "text-primary"}`}>
            {message.text}
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-border/50">
          <p className="text-xs lg:text-sm text-muted-foreground">Password must be at least 8 characters.</p>
          <Button onClick={handleChangePassword} disabled={saving} size="sm" className="w-full sm:w-auto">
            {saving ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </div>

      {/* Two-Factor Authentication - Placeholder */}
      <div className="rounded-lg border border-border/50 p-4 lg:p-6">
        <div className="flex items-start gap-3 lg:gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Smartphone className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base lg:text-lg font-semibold mb-1 lg:mb-2">Two-Factor Authentication</h2>
            <p className="text-xs lg:text-sm text-muted-foreground">
              Add an extra layer of security to your account by enabling two-factor authentication.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-border/50">
          <p className="text-xs lg:text-sm text-muted-foreground">Coming soon</p>
          <Button size="sm" disabled className="w-full sm:w-auto">
            Enable 2FA
          </Button>
        </div>
      </div>

      {/* Active Sessions - Placeholder */}
      <div className="rounded-lg border border-border/50 p-4 lg:p-6">
        <div className="flex items-start gap-3 lg:gap-4">
          <div className="p-2 bg-muted/50 rounded-lg">
            <Shield className="w-4 h-4 lg:w-5 lg:h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base lg:text-lg font-semibold mb-1 lg:mb-2">Active Sessions</h2>
            <p className="text-xs lg:text-sm text-muted-foreground">
              Manage your active sessions and sign out of other devices.
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-border/50">
          <p className="text-xs lg:text-sm text-muted-foreground">Coming soon</p>
          <Button size="sm" variant="destructive" disabled className="w-full sm:w-auto">
            Sign Out All Devices
          </Button>
        </div>
      </div>
    </div>
  )
}
