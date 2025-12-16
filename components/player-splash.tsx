"use client"

import { Monitor } from "lucide-react"

export function PlayerSplash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#00d9b4] opacity-20" />
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#00d9b4] to-[#00b89a] shadow-lg shadow-[#00d9b4]/50">
            <Monitor className="h-16 w-16 text-black" strokeWidth={2.5} />
          </div>
        </div>

        {/* App Name */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">Pointer TV</h1>
          <div className="flex items-center justify-center space-x-2">
            <div className="h-1 w-1 animate-bounce rounded-full bg-[#00d9b4] [animation-delay:-0.3s]" />
            <div className="h-1 w-1 animate-bounce rounded-full bg-[#00d9b4] [animation-delay:-0.15s]" />
            <div className="h-1 w-1 animate-bounce rounded-full bg-[#00d9b4]" />
          </div>
          <p className="text-sm text-[#00d9b4]">Loading player...</p>
        </div>
      </div>
    </div>
  )
}
