# Digital Signage Player - Electron Desktop App

This is a Windows desktop application for the digital signage player. It loads the player from your deployed web app and runs it in fullscreen/kiosk mode.

## Prerequisites

- Node.js 18+ installed
- Your Next.js app deployed and accessible via URL

## Installation

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

## How It Works

The Electron player uses a **dynamic device code system**:

1. **First Launch**: Player shows a setup screen asking for a device code
2. **Get Device Code**: Go to your web dashboard → Screens → Add New Screen → Copy the generated code
3. **Enter Code**: Paste the code into the player setup screen
4. **Connected**: The player saves the code locally and loads your content
5. **Automatic**: On subsequent launches, the player automatically uses the saved code

## Configuration

### Player URL

Edit `electron/main.js` and update the `playerUrl`:

\`\`\`javascript
const CONFIG = {
  playerUrl: process.env.PLAYER_URL || "https://your-app.vercel.app/player",
  devTools: process.env.DEV_TOOLS === "true",
}
\`\`\`

Replace `https://your-app.vercel.app/player` with your actual deployed app URL.

## Development

Run the Electron app in development mode:

\`\`\`bash
# Normal mode
npm run electron

# With developer tools (for debugging)
npm run electron:dev
\`\`\`

## Building the Windows Executable

1. **Update the player URL** in `electron/main.js` with your production URL

2. **Build the executable**:
\`\`\`bash
npm run electron:build
\`\`\`

3. **Find the installer**:
   - The `.exe` installer will be in `dist-electron/`
   - File name: `Digital Signage Player-[version]-Setup.exe`

4. **Distribute**:
   - Copy the installer to your Windows machines
   - Run the installer
   - The app will be installed and can be launched from the Start Menu

## First Time Setup (For End Users)

1. **Install the player** on your Windows PC
2. **Launch the player** - You'll see a setup screen
3. **Go to your web dashboard** in a browser
4. **Create a new screen**:
   - Navigate to Screens section
   - Click "Add New Screen"
   - Copy the generated device code (e.g., `SCR-ABC123`)
5. **Enter the code** in the player setup screen
6. **Click Connect** - The player will save the code and start displaying content

## Resetting Device Code

If you need to change the device code:

1. **Open the player**
2. **Press `Alt` key** to show the menu bar
3. **Click Player → Reset Device Code**
4. **Enter new code** from your dashboard

## Auto-Start on Windows Boot

To make the player start automatically when Windows boots:

### Method 1: Startup Folder (Simple)

1. Press `Win + R` and type: `shell:startup`
2. Create a shortcut to the installed app in this folder
3. The player will now start automatically on boot

### Method 2: Task Scheduler (Advanced)

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: "When the computer starts"
4. Action: "Start a program"
5. Program: Path to the installed `.exe`
6. Check "Run with highest privileges"

## Keyboard Shortcuts

- `Alt` - Show menu bar (to access Reset Device Code)
- `Ctrl + R` - Reload player
- `Ctrl + Q` - Exit player
- `Alt + F4` - Close the app

## Troubleshooting

### Setup screen doesn't appear
- The device code might already be saved
- Use menu: Player → Reset Device Code to show setup screen again

### Player doesn't load after entering code
- Check that the device code is correct
- Verify the device code exists in your web dashboard
- Check your internet connection
- Open DevTools (`npm run electron:dev`) to see console errors

### "Invalid device code" error
- The code might be typed incorrectly
- The screen might have been deleted from the dashboard
- Create a new screen in the dashboard and use that code

### Black screen
- The player URL might be incorrect in `electron/main.js`
- Check the console logs in the terminal where you ran `npm run electron`
- Verify your deployed app is accessible

### Can't exit fullscreen
- Press `Alt` to show menu bar, then Player → Exit
- Or press `Ctrl + Q`
- Or use Task Manager to end the process

## Updating the Player

Since the Electron app loads the player from the web:
1. Update your web app (deploy to Vercel)
2. The Electron app will automatically load the new version
3. No need to rebuild or redistribute the `.exe`

**Note**: If you need to update the Electron app itself (not the player content), you'll need to rebuild and redistribute the `.exe`.

## Building for Other Platforms

\`\`\`bash
# Build for all platforms
npm run electron:build:all

# This will create:
# - Windows: .exe installer
# - macOS: .dmg installer
# - Linux: .AppImage
\`\`\`

## Technical Details

- **Storage**: Device codes are stored locally using `electron-store`
- **Security**: The player runs in a sandboxed environment with context isolation
- **Updates**: Content updates happen automatically via the web app
- **Offline**: The player requires internet connection to load content

## Support

For issues or questions, contact your system administrator.
