#!/usr/bin/env node

/**
 * Figma Design Token Sync Script
 * Fetches design variables from Figma and converts them to W3C token format
 * Usage: node scripts/figma/sync-figma-tokens.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../../')

// Configuration
const FIGMA_TOKEN = process.env.FIGMA_TOKEN
const FIGMA_FILE_ID = process.env.FIGMA_FILE_ID
const FIGMA_API_VERSION = process.env.FIGMA_API_VERSION || 'v1'
const DESIGN_TOKENS_OUTPUT = process.env.DESIGN_TOKENS_OUTPUT || './design-tokens'

if (!FIGMA_TOKEN || !FIGMA_FILE_ID) {
  console.error('❌ Missing FIGMA_TOKEN or FIGMA_FILE_ID in environment variables')
  process.exit(1)
}

const FIGMA_BASE_URL = `https://api.figma.com/${FIGMA_API_VERSION}`
const HEADERS = {
  'X-Figma-Token': FIGMA_TOKEN,
  'Content-Type': 'application/json',
}

// Collection prefixes to extract
const COLLECTION_PREFIXES = [
  'colors',
  'radius',
  'space',
  'padding',
  'bg',
  'text',
  'gap',
  'margin',
]

/**
 * Fetch file variables from Figma API
 */
async function fetchFileVariables() {
  console.log('📡 Fetching variables from Figma...')
  
  try {
    // First, get the file to ensure it exists and token is valid
    const fileResponse = await fetch(
      `${FIGMA_BASE_URL}/files/${FIGMA_FILE_ID}`,
      { headers: HEADERS }
    )
    
    if (fileResponse.status === 403) {
      console.error('❌ Token does not have permission to access this file.')
      console.error('📋 To fix this:')
      console.error('   1. Go to https://figma.com/account')
      console.error('   2. Scroll to "API" section')
      console.error('   3. Delete old token and create a NEW token')
      console.error('   4. Select "file_variables:read" scope')
      console.error('   5. Update FIGMA_TOKEN in .env.local')
      console.error('   6. Re-run npm run tokens:sync')
      process.exit(1)
    }

    if (!fileResponse.ok) {
      throw new Error(`Figma API error: ${fileResponse.status} ${fileResponse.statusText}`)
    }

    // Now fetch variables
    const variablesResponse = await fetch(
      `${FIGMA_BASE_URL}/files/${FIGMA_FILE_ID}/variables/local`,
      { headers: HEADERS }
    )
    
    if (!variablesResponse.ok) {
      throw new Error(`Figma API error: ${variablesResponse.status} ${variablesResponse.statusText}`)
    }
    
    const data = await variablesResponse.json()
    console.log(`✓ Fetched ${Object.keys(data.variables || {}).length} variables`)
    return data
  } catch (error) {
    if (error.message.includes('Figma API error')) {
      console.error('❌', error.message)
    } else {
      console.error('❌ Error fetching Figma variables:', error.message)
    }
    process.exit(1)
  }
}

/**
 * Transform Figma variables to W3C Design Token Format
 */
function transformVariablesToTokens(figmaData) {
  console.log('🔄 Transforming Figma variables to tokens...')
  
  const tokens = {
    $schema: 'https://tokens.studio/schemas/v5/global.json',
    $version: '1.0.0',
  }
  
  const variables = figmaData.variables || {}

  // Group variables by collection name
  Object.entries(variables).forEach(([varId, variable]) => {
    // Extract collection name from variable path (e.g., "colors/primary" -> "colors")
    const parts = variable.name.split('/')
    const collectionName = parts[0]?.toLowerCase() || 'other'
    
    // Check if this collection should be included
    const matchesPrefix = COLLECTION_PREFIXES.some(prefix => 
      collectionName.includes(prefix) || prefix.includes(collectionName)
    )

    if (!matchesPrefix) return

    // Initialize collection in tokens if not exists
    if (!tokens[collectionName]) {
      tokens[collectionName] = {}
    }

    // Get the first resolved value (for local variables)
    const valuesByMode = variable.valuesByMode || {}
    const firstModeValue = Object.values(valuesByMode)[0]

    if (!firstModeValue) return

    // Convert different value types
    let resolvedValue = firstModeValue

    if (variable.resolvedType === 'COLOR' && typeof firstModeValue === 'object') {
      const { r, g, b, a } = firstModeValue
      resolvedValue = rgbaToHex(r, g, b, a)
    }

    // Create token object with sanitized name
    const tokenKey = sanitizeTokenName(variable.name.split('/').slice(1).join('-'))
    if (tokenKey) {
      tokens[collectionName][tokenKey] = {
        $value: resolvedValue,
        $type: getTokenType(variable.resolvedType),
        $description: variable.description || '',
      }
    }
  })

  // Filter out empty collections
  Object.keys(tokens).forEach((key) => {
    if (key.startsWith('$')) return
    if (Object.keys(tokens[key]).length === 0) {
      delete tokens[key]
    }
  })

  const totalTokens = Object.values(tokens).reduce((sum, group) => {
    return sum + (typeof group === 'object' ? Object.keys(group).length : 0)
  }, 0)

  console.log(`✓ Transformed into ${Object.keys(tokens).length - 2} token groups with ${totalTokens} total tokens`)
  return tokens
}

/**
 * Convert RGB to Hex
 */
function rgbaToHex(r, g, b, a = 1) {
  const toHex = (n) => {
    const hex = Math.round(n * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`
  
  if (a < 1) {
    return hex + toHex(a)
  }

  return hex
}

/**
 * Get W3C token type from Figma type
 */
function getTokenType(figmaType) {
  const typeMap = {
    COLOR: 'color',
    FLOAT: 'dimension',
    STRING: 'string',
    BOOLEAN: 'boolean',
  }

  return typeMap[figmaType] || 'dimension'
}

/**
 * Sanitize token names for use in CSS
 */
function sanitizeTokenName(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-/_]/g, '')
    .replace(/^-+|-+$/g, '')
}

/**
 * Save tokens to JSON file
 */
function saveTokens(tokens) {
  const outputPath = path.join(ROOT_DIR, DESIGN_TOKENS_OUTPUT)

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true })
  }

  const filePath = path.join(outputPath, 'tokens.json')
  fs.writeFileSync(filePath, JSON.stringify(tokens, null, 2))

  console.log(`✅ Tokens saved to ${filePath}`)
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Figma Design Token Sync...\n')

  try {
    const figmaData = await fetchFileVariables()
    const tokens = transformVariablesToTokens(figmaData)
    saveTokens(tokens)

    console.log('\n✨ Design token sync completed successfully!')
    console.log(`📁 Output: ${path.join(ROOT_DIR, DESIGN_TOKENS_OUTPUT, 'tokens.json')}`)
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message)
    process.exit(1)
  }
}

main()
