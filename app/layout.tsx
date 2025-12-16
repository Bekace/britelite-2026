import type React from "react"
import type { Metadata } from "next"

import "./globals.css"
import "@/lib/monaco-environment"
import { Inter, Inter as V0_Font_Inter } from 'next/font/google'

// Initialize fonts
const _inter = V0_Font_Inter({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700","800","900"] })

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Xkreen - AI-Powered Digital Signage",
  description: "AI-Powered Digital Signage",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-inter antialiased`}>{children}</body>
    </html>
  )
}
