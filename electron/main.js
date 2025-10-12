const { app, BrowserWindow, screen } = require("electron")
const path = require("path")

// Configuration - can be set via environment variables or config file
const CONFIG = {
  // The URL of your deployed player (change this to your actual URL)
  playerUrl: process.env.PLAYER_URL || "https://your-app.vercel.app/player",
  // Device code for this player instance
  deviceCode: process.env.DEVICE_CODE || "",
  // Whether to start in fullscreen/kiosk mode
  fullscreen: process.env.FULLSCREEN !== "false", // default true
  // Whether to show dev tools (for debugging)
  devTools: process.env.DEV_TOOLS === "true", // default false
}

let mainWindow

function createWindow() {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    fullscreen: CONFIG.fullscreen,
    kiosk: CONFIG.fullscreen,
    frame: !CONFIG.fullscreen, // Hide frame in fullscreen
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  // Build the player URL with device code
  const playerUrl = CONFIG.deviceCode ? `${CONFIG.playerUrl}/${CONFIG.deviceCode}` : CONFIG.playerUrl

  console.log("[Electron Player] Loading URL:", playerUrl)
  console.log("[Electron Player] Fullscreen:", CONFIG.fullscreen)
  console.log("[Electron Player] Device Code:", CONFIG.deviceCode || "Not set")

  // Load the player
  mainWindow.loadURL(playerUrl)

  // Open DevTools if enabled
  if (CONFIG.devTools) {
    mainWindow.webContents.openDevTools()
  }

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null
  })

  // Prevent navigation away from player
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(CONFIG.playerUrl)) {
      event.preventDefault()
      console.log("[Electron Player] Blocked navigation to:", url)
    }
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log("[Electron Player] Blocked external link:", url)
    return { action: "deny" }
  })
}

// App lifecycle
app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})

// Handle errors
process.on("uncaughtException", (error) => {
  console.error("[Electron Player] Uncaught Exception:", error)
})

app.on("web-contents-created", (event, contents) => {
  // Prevent new windows
  contents.on("new-window", (event) => {
    event.preventDefault()
  })
})
