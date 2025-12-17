"use client"

export function PlayerSplash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#00b89a] opacity-20" />
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#0e0e0e] to-[#00b89a] shadow-lg shadow-[#00d9b4]/50 bg-black">
            <img src="/xkreen-logo.svg" alt="Xkreen Logo" className="w-24 h-fit" />
          </div>
        </div>

        {/* App Name */}
        <div className="space-y-2">
          <h1 className="tracking-tight text-white text-6xl font-extralight">Xkreen Player </h1>
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
