"use client"

export function PlayerSplash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#00d9b4] opacity-20" />
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#00d9b4] to-[#00b89a] shadow-lg shadow-[#00d9b4]/50">
            <svg viewBox="0 0 100 100" className="h-20 w-20" fill="none">
              {/* Screen/Monitor shape */}
              <rect x="20" y="25" width="60" height="40" rx="4" fill="black" stroke="black" strokeWidth="3" />
              <rect x="25" y="30" width="50" height="30" fill="black" />

              {/* X mark overlaid on screen */}
              <path
                d="M 35 40 L 50 50 L 65 40 M 50 50 L 35 60 M 50 50 L 65 60"
                stroke="black"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Stand */}
              <rect x="45" y="65" width="10" height="8" fill="black" />
              <rect x="35" y="73" width="30" height="3" rx="1.5" fill="black" />
            </svg>
          </div>
        </div>

        {/* App Name */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">Xkreen</h1>
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
