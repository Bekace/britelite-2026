#!/usr/bin/env node

/**
 * Design Token Transformer
 * Converts W3C tokens.json to CSS variables, Tailwind config, and TypeScript types
 * Usage: node scripts/design-tokens/transform-tokens.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../../')
const TOKENS_FILE = path.join(ROOT_DIR, 'design-tokens', 'tokens.json')

if (!fs.existsSync(TOKENS_FILE)) {
  console.error('❌ tokens.json not found. Run sync-figma-tokens.mjs first.')
  process.exit(1)
}

// Load tokens
const rawTokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'))

/**
 * Transform tokens to CSS variables
 */
function generateCSSVariables(tokens) {
  console.log('📝 Generating CSS variables...')

  let cssVariables = ''

  Object.entries(tokens).forEach(([group, values]) => {
    if (group.startsWith('$')) return

    Object.entries(values).forEach(([key, token]) => {
      if (typeof token === 'object' && '$value' in token) {
        const cssVarName = `--${group}-${key}`.replace(/[/_]/g, '-')
        cssVariables += `  ${cssVarName}: ${token.$value};\n`
      }
    })
  })

  return cssVariables
}

/**
 * Generate CSS file
 */
function generateCSSFile(cssVariables) {
  console.log('💾 Writing CSS variables to globals.css...')

  // Read existing globals.css
  const globalsPath = path.join(ROOT_DIR, 'app', 'globals.css')
  let existingCSS = fs.existsSync(globalsPath) 
    ? fs.readFileSync(globalsPath, 'utf-8') 
    : '@import \'tailwindcss\';\n\n'

  // Find and replace or add design tokens section
  const startMarker = '/* Design Tokens - Auto-generated from Figma */'
  const endMarker = '/* End Design Tokens */'

  const newTokensSection = `${startMarker}
:root {
${cssVariables}}
${endMarker}\n`

  if (existingCSS.includes(startMarker)) {
    // Replace existing section
    const startIdx = existingCSS.indexOf(startMarker)
    const endIdx = existingCSS.indexOf(endMarker) + endMarker.length
    existingCSS = existingCSS.substring(0, startIdx) + newTokensSection + existingCSS.substring(endIdx)
  } else {
    // Add after imports
    const importEndIdx = existingCSS.lastIndexOf('\n\n')
    if (importEndIdx !== -1) {
      existingCSS = existingCSS.substring(0, importEndIdx + 2) + newTokensSection + existingCSS.substring(importEndIdx + 2)
    } else {
      existingCSS = newTokensSection + existingCSS
    }
  }

  fs.writeFileSync(globalsPath, existingCSS)
  console.log(`✓ CSS variables written to ${globalsPath}`)
}

/**
 * Generate Tailwind config
 */
function generateTailwindConfig(tokens) {
  console.log('⚙️  Generating Tailwind config...')

  const tailwindConfig = {
    colors: {},
    spacing: {},
    borderRadius: {},
    gap: {},
    padding: {},
    margin: {},
  }

  // Map colors
  if (tokens.colors) {
    Object.entries(tokens.colors).forEach(([key, token]) => {
      if (typeof token === 'object' && '$value' in token) {
        tailwindConfig.colors[key] = `var(--colors-${key})`
      }
    })
  }

  // Map spacing
  if (tokens.space) {
    Object.entries(tokens.space).forEach(([key, token]) => {
      if (typeof token === 'object' && '$value' in token) {
        tailwindConfig.spacing[key] = `var(--space-${key})`
      }
    })
  }

  // Map border radius
  if (tokens.radius) {
    Object.entries(tokens.radius).forEach(([key, token]) => {
      if (typeof token === 'object' && '$value' in token) {
        tailwindConfig.borderRadius[key] = `var(--radius-${key})`
      }
    })
  }

  // Map gap
  if (tokens.gap) {
    Object.entries(tokens.gap).forEach(([key, token]) => {
      if (typeof token === 'object' && '$value' in token) {
        tailwindConfig.gap[key] = `var(--gap-${key})`
      }
    })
  }

  // Map padding
  if (tokens.padding) {
    Object.entries(tokens.padding).forEach(([key, token]) => {
      if (typeof token === 'object' && '$value' in token) {
        tailwindConfig.padding[key] = `var(--padding-${key})`
      }
    })
  }

  // Map margin
  if (tokens.margin) {
    Object.entries(tokens.margin).forEach(([key, token]) => {
      if (typeof token === 'object' && '$value' in token) {
        tailwindConfig.margin[key] = `var(--margin-${key})`
      }
    })
  }

  return tailwindConfig
}

/**
 * Save Tailwind config
 */
function saveTailwindConfig(config) {
  const configPath = path.join(ROOT_DIR, 'design-tokens', 'tailwind-config.json')
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
  console.log(`✓ Tailwind config saved to ${configPath}`)
}

/**
 * Generate TypeScript types
 */
function generateTypeScriptTypes(tokens) {
  console.log('📘 Generating TypeScript types...')

  let tsContent = `/**
 * Auto-generated from Figma Design Tokens
 * Do not edit manually
 */

export const designTokens = {
`

  Object.entries(tokens).forEach(([group, values]) => {
    if (group.startsWith('$')) return

    tsContent += `  ${group}: {\n`

    Object.entries(values).forEach(([key, token]) => {
      if (typeof token === 'object' && '$value' in token) {
        tsContent += `    ${key}: 'var(--${group}-${key})',\n`
      }
    })

    tsContent += '  },\n'
  })

  tsContent += `} as const

export type DesignTokens = typeof designTokens
`

  return tsContent
}

/**
 * Save TypeScript types
 */
function saveTypeScriptTypes(content) {
  const typePath = path.join(ROOT_DIR, 'design-tokens', 'tokens.ts')
  fs.writeFileSync(typePath, content)
  console.log(`✓ TypeScript types saved to ${typePath}`)
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Starting Design Token Transformation...\n')

  try {
    // Generate CSS
    const cssVariables = generateCSSVariables(rawTokens)
    generateCSSFile(cssVariables)

    // Generate Tailwind config
    const tailwindConfig = generateTailwindConfig(rawTokens)
    saveTailwindConfig(tailwindConfig)

    // Generate TypeScript types
    const tsTypes = generateTypeScriptTypes(rawTokens)
    saveTypeScriptTypes(tsTypes)

    console.log('\n✨ Token transformation completed successfully!')
    console.log(`📂 Design tokens saved to ${path.join(ROOT_DIR, 'design-tokens')}`)
  } catch (error) {
    console.error('\n❌ Transformation failed:', error.message)
    process.exit(1)
  }
}

main()
