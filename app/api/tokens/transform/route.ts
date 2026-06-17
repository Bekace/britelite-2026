import { NextRequest, NextResponse } from 'next/server'

// ── Types ──────────────────────────────────────────────────────────────────────

type TokenValue = string | number

type ModeMap = Record<string, TokenValue>

type TokenEntry =
  | { light: string; dark: string }   // color collection with Light/Dark modes
  | string                             // single-value collection (radius, spacing, etc.)

type TokenMap = Record<string, Record<string, { light: string; dark: string }>>

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Detect if a collection has Figma-style Light/Dark mode keys.
 * Figma exports collections where the top-level keys are mode names.
 */
function hasModes(obj: Record<string, any>): boolean {
  const keys = Object.keys(obj).map(k => k.toLowerCase())
  return keys.includes('light') || keys.includes('dark')
}

/**
 * Normalise a raw token value to a string. Figma may export numbers.
 */
function normalise(val: any): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') {
    // Figma RGBA object  { r, g, b, a }
    if ('r' in val && 'g' in val && 'b' in val) {
      return rgbaToHex(val.r, val.g, val.b, val.a ?? 1)
    }
    return JSON.stringify(val)
  }
  return String(val)
}

function rgbaToHex(r: number, g: number, b: number, a = 1): string {
  const byte = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0')
  const alpha = a < 1 ? byte(a) : ''
  return `#${byte(r)}${byte(g)}${byte(b)}${alpha}`.toUpperCase()
}

/**
 * Sanitise a token key into a valid CSS custom property fragment.
 * "Button / Primary / Default" → "button-primary-default"
 */
function sanitise(key: string): string {
  return key
    .toLowerCase()
    .replace(/\s*\/\s*/g, '-')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Core transformation ────────────────────────────────────────────────────────

/**
 * Flatten a nested token object into a flat map of { cssVarSuffix: value }.
 * e.g. { button: { primary: "#fff" } } → { "button-primary": "#fff" }
 */
function flattenTokens(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(obj)) {
    const segment = sanitise(key)
    const fullKey = prefix ? `${prefix}-${segment}` : segment
    if (val !== null && typeof val === 'object' && !('r' in val)) {
      Object.assign(result, flattenTokens(val, fullKey))
    } else {
      result[fullKey] = normalise(val)
    }
  }
  return result
}

/**
 * Main parser. Handles both:
 *   - Mode-based collections: { colors: { Light: { primary: "…" }, Dark: { primary: "…" } } }
 *   - Simple collections:     { radius: { sm: "4px", md: "8px" } }
 */
function parseTokens(input: Record<string, any>): {
  tokenMap: TokenMap
  lightVars: Record<string, string>
  darkVars: Record<string, string>
} {
  const tokenMap: TokenMap = {}
  const lightVars: Record<string, string> = {}
  const darkVars: Record<string, string> = {}

  for (const [collection, value] of Object.entries(input)) {
    if (typeof value !== 'object' || value === null) continue
    const collKey = sanitise(collection)
    tokenMap[collKey] = {}

    if (hasModes(value)) {
      // Figma mode-aware collection
      const lightRaw = value['Light'] ?? value['light'] ?? {}
      const darkRaw  = value['Dark']  ?? value['dark']  ?? lightRaw

      const lightFlat = flattenTokens(lightRaw)
      const darkFlat  = flattenTokens(darkRaw)

      // Union of all keys from both modes
      const allKeys = new Set([...Object.keys(lightFlat), ...Object.keys(darkFlat)])
      for (const k of allKeys) {
        const lv = lightFlat[k] ?? darkFlat[k] ?? ''
        const dv = darkFlat[k]  ?? lv
        const cssVar = `--${collKey}-${k}`
        tokenMap[collKey][k] = { light: lv, dark: dv }
        lightVars[cssVar] = lv
        darkVars[cssVar]  = dv
      }
    } else {
      // Simple (no modes): same value for light and dark
      const flat = flattenTokens(value)
      for (const [k, v] of Object.entries(flat)) {
        const cssVar = `--${collKey}-${k}`
        tokenMap[collKey][k] = { light: v, dark: v }
        lightVars[cssVar] = v
        darkVars[cssVar]  = v
      }
    }
  }

  return { tokenMap, lightVars, darkVars }
}

// ── CSS generation ─────────────────────────────────────────────────────────────

function buildCSSBlock(vars: Record<string, string>, selector: string): string {
  const lines = Object.entries(vars)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')
  return `${selector} {\n${lines}\n}`
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tokens } = body

    if (!tokens || typeof tokens !== 'object') {
      return NextResponse.json({ error: 'Invalid tokens: expected a JSON object.' }, { status: 400 })
    }

    const { tokenMap, lightVars, darkVars } = parseTokens(tokens)

    const lightCSS = buildCSSBlock(lightVars, ':root')
    const darkCSS  = buildCSSBlock(darkVars, '.dark')
    const combined = `/* Design Tokens — Light */\n${lightCSS}\n\n/* Design Tokens — Dark */\n${darkCSS}`

    const totalTokens = Object.values(tokenMap).reduce(
      (sum, group) => sum + Object.keys(group).length, 0
    )

    const collections = Object.keys(tokenMap)

    return NextResponse.json({
      css: { light: lightCSS, dark: darkCSS, combined },
      tokenMap,
      collections,
      totalTokens,
    })
  } catch (err: any) {
    console.error('[tokens/transform]', err)
    return NextResponse.json({ error: err.message || 'Transform failed' }, { status: 500 })
  }
}
