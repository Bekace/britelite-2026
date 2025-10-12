const { app, BrowserWindow, screen, ipcMain, Menu } = require("electron")
const path = require("path")
const Store = require("electron-store")

// Initialize persistent storage
const store = new Store()

// Configuration
const CONFIG = {
  playerUrl: process.env.PLAYER_URL || "https://xkreen.vercel.app/player",
  devTools: process.env.DEV_TOOLS === "true",
}

let mainWindow

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    fullscreen: true,
    kiosk: true,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })

  const deviceCode = store.get("deviceCode")

  if (!deviceCode) {
    // No device code - show setup screen
    console.log("[Electron Player] No device code found, showing setup screen")
    mainWindow.loadFile(path.join(__dirname, "setup.html"))
  } else {
    // Device code exists - load player
    loadPlayer(deviceCode)
  }

  if (CONFIG.devTools) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  createMenu()
}

function loadPlayer(deviceCode) {
  const playerUrl = `${CONFIG.playerUrl}/${deviceCode}`
  console.log("[Electron Player] Loading player:", playerUrl)
  console.log("[Electron Player] Device Code:", deviceCode)

  mainWindow.loadURL(playerUrl)

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

function createMenu() {
  const template = [
    {
      label: "Player",
      submenu: [
        {
          label: "Reset Device Code",
          click: () => {
            store.delete("deviceCode")
            console.log("[Electron Player] Device code reset")
            if (mainWindow) {
              mainWindow.loadFile(path.join(__dirname, "setup.html"))
            }
          },
        },
        { type: "separator" },
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            if (mainWindow) mainWindow.reload()
          },
        },
        { type: "separator" },
        {
          label: "Exit",
          accelerator: "CmdOrCtrl+Q",
          click: () => {
            app.quit()
          },
        },
      ],
    },
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

ipcMain.handle("save-device-code", async (event, deviceCode) => {
  try {
    store.set("deviceCode", deviceCode)
    console.log("[Electron Player] Device code saved:", deviceCode)
    return true
  } catch (error) {
    console.error("[Electron Player] Error saving device code:", error)
    return false
  }
})

ipcMain.handle("reload-player", async () => {
  const deviceCode = store.get("deviceCode")
  if (deviceCode && mainWindow) {
    loadPlayer(deviceCode)
  }
})

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
  contents.on("new-window", (event) => {
    event.preventDefault()
  })
})
