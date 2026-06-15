# Design Token System - Setup & Troubleshooting Guide

## Quick Start

The design token system is now fully set up! Here's how to use it:

### 1. Fix Your Figma Token Permission

Your current token doesn't have the right scope. Follow these steps:

1. **Go to Figma Account Settings**
   - Visit: https://figma.com/account

2. **Find the API Section**
   - Scroll down to "API" section
   - Look for "Personal access tokens"

3. **Create a New Token**
   - Click "Create a new token"
   - Give it a name like "v0-design-tokens"
   - **Important**: Select the "file_variables:read" scope
   - Click "Create"

4. **Copy and Update**
   - Copy the new token (it will only show once)
   - Replace the token in `.env.local`:
     ```
     FIGMA_TOKEN=figd_your_new_token_here
     ```

5. **Re-run Sync**
   ```bash
   npm run tokens:sync
   ```

### 2. Verify the System Works

Test the complete pipeline:

```bash
# Fetch from Figma (once token is fixed)
npm run tokens:sync

# Or transform existing tokens
npm run tokens:transform

# Or run both at once
npm run tokens:all
```

### 3. Use Tokens in Your Code

#### Option A: CSS Variables
```jsx
<div style={{ color: 'var(--colors-primary)' }}>
  Colored text
</div>
```

#### Option B: Tailwind Classes
```jsx
<div className="text-primary bg-secondary p-md rounded-lg gap-sm">
  Styled with tokens
</div>
```

#### Option C: TypeScript Constants
```typescript
import { designTokens } from '@/design-tokens/tokens'

<button style={{ color: designTokens.colors.primary }}>
  Click me
</button>
```

## File Structure

```
project-root/
├── .env.local                          # Your Figma credentials ⚠️ NEVER commit
├── scripts/
│   ├── figma/
│   │   └── sync-figma-tokens.mjs       # Fetches from Figma API
│   └── design-tokens/
│       ├── sync-all.mjs                # Master script (does both steps)
│       └── transform-tokens.mjs        # Generates CSS/Tailwind/TS
├── design-tokens/                      # Generated outputs
│   ├── tokens.json                     # W3C standard format
│   ├── tokens.ts                       # TypeScript types
│   └── tailwind-config.json            # Tailwind configuration
├── app/
│   └── globals.css                     # Updated with CSS variables
└── DESIGN_TOKENS.md                    # Full documentation
```

## Available Commands

```bash
# Complete sync (fetch from Figma + transform)
npm run tokens:all

# Fetch from Figma only
npm run tokens:sync

# Transform existing tokens only
npm run tokens:transform

# Watch for changes (auto-transform)
npm run tokens:watch
```

## How It Works

1. **Figma API Sync** (`sync-figma-tokens.mjs`)
   - Fetches design variables from your Figma file
   - Converts colors (RGB → Hex), dimensions, and other types
   - Saves as W3C standard JSON format

2. **Token Transform** (`transform-tokens.mjs`)
   - Reads `design-tokens/tokens.json`
   - Generates three outputs:
     - CSS variables in `app/globals.css`
     - Tailwind config in `design-tokens/tailwind-config.json`
     - TypeScript constants in `design-tokens/tokens.ts`

## Troubleshooting

### "Token does not have permission to access this file"

**Solution**: Create a new token with "file_variables:read" scope
```
1. https://figma.com/account → API section
2. Delete old token if there is one
3. Click "Create a new token"
4. Select "file_variables:read" scope
5. Update FIGMA_TOKEN in .env.local
6. npm run tokens:sync
```

### "No variables found"

**Possible causes:**
- Figma file doesn't have variables set up
- Variables aren't in collections with matching names (colors, radius, space, padding, bg, text, gap, margin)
- API hasn't refreshed yet (wait a minute)

**Check your Figma file:**
1. Open your Figma design system file
2. Go to Assets panel → Variables
3. Create variable collections if missing:
   - `colors` - for color tokens
   - `space` - for spacing scales
   - `radius` - for border radius
   - etc.
4. Add variables inside collections
5. Re-run sync

### CSS variables not appearing in globals.css

**Check:**
1. Run `npm run tokens:transform` manually
2. Look for error messages
3. Verify `design-tokens/tokens.json` exists and has content
4. Check that globals.css is readable/writable

### Tailwind tokens not working

**To use Tailwind tokens, merge the config:**

Create or update `tailwind.config.ts`:
```typescript
import tailwindConfig from './design-tokens/tailwind-config.json'

export default {
  theme: {
    extend: {
      colors: tailwindConfig.colors,
      spacing: tailwindConfig.spacing,
      borderRadius: tailwindConfig.borderRadius,
      gap: tailwindConfig.gap,
      padding: tailwindConfig.padding,
    },
  },
}
```

Then use in components:
```jsx
<div className="text-primary bg-secondary p-md rounded-md gap-sm">
  Styled!
</div>
```

## Example Workflow

### For Designers

1. Update colors/spacing/etc in Figma design system file
2. Message dev team: "Updated primary color and spacing scale"
3. Done! No plugin usage needed

### For Developers

1. Receive notification about updates
2. Run: `npm run tokens:all`
3. Check `design-tokens/tokens.json` for changes
4. Commit updated files to git
5. Redeploy application

## Integration with CI/CD

To auto-sync tokens on every push, add to your GitHub Actions:

```yaml
name: Sync Design Tokens

on: [push]

jobs:
  sync-tokens:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Sync Figma tokens
        run: npm run tokens:all
        env:
          FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
          FIGMA_FILE_ID: ${{ secrets.FIGMA_FILE_ID }}
      
      - name: Commit changes
        run: |
          git add design-tokens/ app/globals.css
          git commit -m "chore: sync design tokens from Figma" || true
          git push
```

## Advanced: Add New Token Types

To add a new collection (e.g., "shadows", "animations"):

1. **In Figma**: Create a new variable collection with that name
2. **In script**: Add to `COLLECTION_PREFIXES` in `scripts/figma/sync-figma-tokens.mjs`
3. **Run**: `npm run tokens:sync`
4. **Tokens automatically extracted!**

## Reference

- **Figma API Docs**: https://www.figma.com/developers/api
- **W3C Design Tokens**: https://tr.designtokens.org/format/
- **Tailwind Docs**: https://tailwindcss.com/docs

## Next Steps

1. ✅ Generate a new Figma token with proper scope
2. ✅ Run `npm run tokens:sync` to fetch your actual tokens
3. ✅ Use CSS variables/Tailwind/TypeScript in components
4. ✅ Set up CI/CD integration (optional but recommended)
5. ✅ Share workflow with your design team

Need help? Check `DESIGN_TOKENS.md` for complete documentation!
