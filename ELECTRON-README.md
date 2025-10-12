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

## Configuration

The player can be configured using environment variables:

- `PLAYER_URL` - The base URL of your deployed player (default: `https://your-app.vercel.app/player`)
- `DEVICE_CODE` - The device code for this player instance (optional)
- `FULLSCREEN` - Whether to start in fullscreen mode (default: `true`)
- `DEV_TOOLS` - Whether to show developer tools (default: `false`)

### Option 1: Environment Variables

Create a `.env` file in the project root:

\`\`\`env
PLAYER_URL=https://your-app.vercel.app/player
DEVICE_CODE=abc123
FULLSCREEN=true
DEV_TOOLS=false
\`\`\`

### Option 2: Edit electron/main.js

Open `electron/main.js` and modify the `CONFIG` object:

\`\`\`javascript
const CONFIG = {
  playerUrl: 'https://your-app.vercel.app/player',
  deviceCode: 'abc123',
  fullscreen: true,
  devTools: false,
}
\`\`\`

## Development

Run the Electron app in development mode:

\`\`\`bash
# Normal mode
npm run electron

# With developer tools (for debugging)
npm run electron:dev
\`\`\`

## Building the Windows Executable

1. **Update configuration** in `electron/main.js` with your production URL and settings

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

## Auto-Start on Windows Boot

To make the player start automatically when Windows boots:

### Method 1: Startup Folder (Simple)

1. Press `Win + R` and type: `shell:startup`
2. Create a shortcut to the installed app in this folder
3. Right-click the shortcut → Properties
4. Add `--fullscreen` to the Target field (optional)

### Method 2: Task Scheduler (Advanced)

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: "When the computer starts"
4. Action: "Start a program"
5. Program: Path to the installed `.exe`
6. Check "Run with highest privileges"

## Keyboard Shortcuts

- `F11` - Toggle fullscreen (if not in kiosk mode)
- `Alt + F4` - Close the app
- `Ctrl + Shift + I` - Open DevTools (if DEV_TOOLS=true)

## Troubleshooting

### Player doesn't load
- Check that `PLAYER_URL` is correct and accessible
- Check your internet connection
- Open DevTools (`DEV_TOOLS=true`) to see console errors

### Black screen
- The player URL might be incorrect
- Check the console logs in the terminal where you ran `npm run electron`

### Can't exit fullscreen
- Press `Alt + F4` to close the app
- Or use Task Manager to end the process

## Updating the Player

Since the Electron app loads the player from the web:
1. Update your web app (deploy to Vercel)
2. The Electron app will automatically load the new version
3. No need to rebuild or redistribute the `.exe`

## Building for Other Platforms

\`\`\`bash
# Build for all platforms
npm run electron:build:all

# This will create:
# - Windows: .exe installer
# - macOS: .dmg installer
# - Linux: .AppImage
\`\`\`

## Support

For issues or questions, contact your system administrator.
