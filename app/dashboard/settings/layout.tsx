import type React from "react"
import { SettingsSidebar } from "@/components/dashboard/settings-sidebar"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="border-b border-border/50 pb-4 lg:pb-6">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Account Settings</h1>
      </div>

      {/* Mobile: Horizontal tabs at top */}
      <div className="lg:hidden">
        <SettingsSidebar />
      </div>

      {/* Two-column layout for desktop */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
        {/* Left sidebar navigation - desktop only */}
        <div className="hidden lg:block">
          <SettingsSidebar />
        </div>

        {/* Content area */}
        <div className="flex-1 lg:max-w-3xl">{children}</div>
      </div>
    </div>
  )
}
