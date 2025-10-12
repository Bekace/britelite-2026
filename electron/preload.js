// Preload script for Electron
// This runs before the web page loads and can expose safe APIs to the renderer

const { contextBridge, ipcRenderer } = require("electron")

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  version: process.versions.electron,
  // Save device code to persistent storage
  saveDeviceCode: (deviceCode) => ipcRenderer.invoke("save-device-code", deviceCode),
  // Reload player after setup
  reloadPlayer: () => ipcRenderer.invoke("reload-player"),
})

console.log("[Electron Player] Preload script loaded")
