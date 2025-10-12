// Preload script for Electron
// This runs before the web page loads and can expose safe APIs to the renderer

const { contextBridge } = require("electron")

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  version: process.versions.electron,
})

console.log("[Electron Player] Preload script loaded")
