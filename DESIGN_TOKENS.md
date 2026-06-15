# Design Token Management System

Complete design token management system that syncs your Figma design system directly to your Next.js project via API (no plugins required).

## Architecture

```
Figma Design System (Variables/Collections)
          ↓
    Figma API
          ↓
sync-figma-tokens.mjs (Fetch & Extract)
          ↓
design-tokens/tokens.json (W3C Standard Format)
          ↓
transform-tokens.mjs (Generate Outputs)
          ↓
├─ app/globals.css (CSS Variables)
├─ design-tokens/tailwind-config.json (Tailwind Tokens)
└─ design-tokens/tokens.ts (TypeScript Types)
```

## Setup

### 1. Environment Variables

Your `.env.local` has been configured with:
- `FIGMA_TOKEN`: Your Figma Personal Access Token
- `FIGMA_FILE_ID`: Your design system file ID
- `FIGMA_API_VERSION`: API version (default: v1)
- `DESIGN_TOKENS_OUTPUT`: Output directory (default: ./design-tokens)

### 2. Figma Collections

The system extracts variables from these collections:
- `colors` - Brand colors, neutral colors, semantic colors
- `radius` - Border radius values
- `space` - Spacing scale (xs, sm, md, lg, xl, etc.)
- `padding` - Padding tokens
- `bg` - Background colors
- `text` - Text/typography colors
- `gap` - Gap spacing
- `margin` - Margin tokens

Add more collections by updating `COLLECTION_PREFIXES` in `scripts/figma/sync-figma-tokens.mjs`.

## Usage

### Complete Sync (Recommended)

Sync from Figma AND transform all outputs:

```bash
npm run tokens:all
```

This runs:
1. `sync-figma-tokens.mjs` - Fetches from Figma
2. `transform-tokens.mjs` - Generates outputs

### Individual Commands

**Sync from Figma only:**
```bash
npm run tokens:sync
```
Fetches variables from Figma and saves to `design-tokens/tokens.json`

**Transform tokens only:**
```bash
npm run tokens:transform
```
Takes existing `design-tokens/tokens.json` and generates CSS/Tailwind/TS outputs

**Watch mode (for development):**
```bash
npm run tokens:watch
```
Watches for changes to `design-tokens/` and auto-transforms

## Generated Files

### 1. `app/globals.css` (CSS Variables)

Automatically updated with CSS custom properties:

```css
/* Design Tokens - Auto-generated from Figma */
:root {
  --colors-primary: #0891b2;
  --colors-secondary: #ec4899;
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --radius-sm: 0.375rem;
  --radius-lg: 0.5rem;
  /* ... more tokens ... */
}
```

**Usage in components:**
```jsx
<div style={{ color: 'var(--colors-primary)' }}>Primary text</div>
```

### 2. `design-tokens/tokens.json` (W3C Standard)

Raw token data in W3C Design Tokens format:

```json
{
  "$schema": "https://tokens.studio/schemas/v5/global.json",
  "$version": "1.0.0",
  "colors": {
    "primary": {
      "$value": "#0891b2",
      "$type": "color",
      "$description": "Primary brand color"
    }
  }
}
```

### 3. `design-tokens/tailwind-config.json` (Tailwind Integration)

Configure Tailwind to use design tokens:

```json
{
  "colors": {
    "primary": "var(--colors-primary)",
    "secondary": "var(--colors-secondary)"
  },
  "spacing": {
    "xs": "var(--space-xs)",
    "sm": "var(--space-sm)"
  }
}
```

**Usage in Tailwind:**
```jsx
<div className="text-primary bg-secondary p-sm">Styled with tokens</div>
```

### 4. `design-tokens/tokens.ts` (TypeScript)

Strongly-typed token constants:

```typescript
export const designTokens = {
  colors: {
    primary: 'var(--colors-primary)',
    secondary: 'var(--colors-secondary)',
  },
  space: {
    xs: 'var(--space-xs)',
    sm: 'var(--space-sm)',
  },
} as const

export type DesignTokens = typeof designTokens
```

**Usage in components:**
```typescript
import { designTokens } from '@/design-tokens/tokens'

export const Button = () => (
  <button style={{ color: designTokens.colors.primary }}>
    Click me
  </button>
)
```

## Workflow

### For Designers

1. Update your Figma design system variables
2. Notify the development team
3. Dev runs `npm run tokens:all`
4. Changes automatically propagate to the codebase

### For Developers

1. Run `npm run tokens:all` when design tokens change
2. Use CSS variables: `var(--colors-primary)`
3. Use Tailwind classes: `text-primary`, `bg-secondary`
4. Use TypeScript: `designTokens.colors.primary`
5. Commit `design-tokens/tokens.json` to version control

## Customization

### Add New Collections

1. **In Figma**: Create a new variable collection (e.g., "shadows", "animations")
2. **In script**: Update `COLLECTION_PREFIXES` in `scripts/figma/sync-figma-tokens.mjs`:

```javascript
const COLLECTION_PREFIXES = [
  'colors',
  'radius',
  'space',
  // ... existing ...
  'shadows',      // Add new
  'animations',   // Add new
]
```

3. Run `npm run tokens:all` to sync

### Override Tokens Locally

For local development or testing:

1. Edit `design-tokens/tokens.json` manually
2. Run `npm run tokens:transform` to regenerate CSS/Tailwind/TS
3. Changes are not synced back to Figma (one-way sync)

### Integrate with CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Sync Design Tokens
  run: npm run tokens:all
  env:
    FIGMA_TOKEN: ${{ secrets.FIGMA_TOKEN }}
    FIGMA_FILE_ID: ${{ secrets.FIGMA_FILE_ID }}

- name: Commit Changes
  run: |
    git add design-tokens/
    git commit -m "chore: sync design tokens from Figma"
```

## Troubleshooting

### "Missing FIGMA_TOKEN or FIGMA_FILE_ID"

Check your `.env.local` file contains both variables.

### "Figma API error: 401 Unauthorized"

Your token is invalid or expired. Generate a new Personal Access Token:
1. Go to https://figma.com/account
2. Scroll to "API" section
3. Click "Create a new token"
4. Select "file_variables:read" scope
5. Copy and update `FIGMA_TOKEN` in `.env.local`

### "No variables found"

Check that your Figma file has variables in collections with the matching prefixes (colors, radius, space, etc.)

## File Structure

```
project-root/
├── scripts/
│   ├── figma/
│   │   └── sync-figma-tokens.mjs       # Figma API sync
│   └── design-tokens/
│       ├── sync-all.mjs                # Master script
│       └── transform-tokens.mjs        # Token transformer
├── design-tokens/
│   ├── tokens.json                     # Generated: W3C tokens
│   ├── tokens.ts                       # Generated: TypeScript types
│   └── tailwind-config.json            # Generated: Tailwind config
├── app/
│   └── globals.css                     # Updated: CSS variables
├── .env.local                          # Your Figma credentials
└── package.json                        # Token scripts
```

## Security

- **Never commit `.env.local`** to version control
- Token is read-only (scoped to `file_variables:read`)
- Consider using environment secrets in CI/CD
- Rotate tokens regularly if compromised

## References

- [Figma API Documentation](https://www.figma.com/developers/api)
- [W3C Design Tokens Format](https://tr.designtokens.org/format/)
- [Tailwind CSS Custom Properties](https://tailwindcss.com/docs/theme#using-css-variables)
