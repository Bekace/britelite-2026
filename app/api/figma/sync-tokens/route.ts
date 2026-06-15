import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    const token = process.env.FIGMA_TOKEN
    const fileId = process.env.FIGMA_FILE_ID

    if (!token || !fileId) {
      return NextResponse.json(
        { error: 'Missing FIGMA_TOKEN or FIGMA_FILE_ID' },
        { status: 400 }
      )
    }

    // Fetch variables from Figma
    const variablesResponse = await fetch(
      `https://api.figma.com/v1/files/${fileId}/variables/local`,
      {
        headers: {
          'X-Figma-Token': token,
        },
      }
    )

    if (!variablesResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch variables: ${variablesResponse.status}` },
        { status: variablesResponse.status }
      )
    }

    const figmaData = await variablesResponse.json()
    const variables = figmaData.variables || {}

    // Transform to W3C token format
    const tokens = transformFigmaToTokens(variables)

    // Save tokens.json
    const designTokensDir = path.join(process.cwd(), 'design-tokens')
    if (!fs.existsSync(designTokensDir)) {
      fs.mkdirSync(designTokensDir, { recursive: true })
    }

    const tokensPath = path.join(designTokensDir, 'tokens.json')
    fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2))

    console.log(`[Figma] Synced ${Object.keys(variables).length} variables to design-tokens/tokens.json`)

    return NextResponse.json({
      status: 'synced',
      tokenCount: Object.keys(variables).length,
      message: 'Tokens synced successfully',
      path: tokensPath,
    })
  } catch (error) {
    console.error('Figma sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync tokens', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function transformFigmaToTokens(variables: Record<string, any>) {
  const tokens: Record<string, any> = {
    $schema: 'https://tokens.studio/schemas/v5/global.json',
    $version: '1.0.0',
  }

  Object.entries(variables).forEach(([, variable]: [string, any]) => {
    if (!variable.name) return

    const parts = variable.name.split('/')
    const collectionName = parts[0]?.toLowerCase() || 'other'

    if (!tokens[collectionName]) {
      tokens[collectionName] = {}
    }

    // Get resolved value
    const valuesByMode = variable.valuesByMode || {}
    const firstModeValue = Object.values(valuesByMode)[0]

    if (!firstModeValue) return

    let resolvedValue = firstModeValue

    // Convert color values
    if (variable.resolvedType === 'COLOR' && typeof firstModeValue === 'object') {
      const { r, g, b, a } = firstModeValue
      resolvedValue = rgbaToHex(r, g, b, a)
    }

    const tokenKey = sanitizeTokenName(parts.slice(1).join('-'))
    if (tokenKey) {
      tokens[collectionName][tokenKey] = {
        $value: resolvedValue,
        $type: getTokenType(variable.resolvedType),
        $description: variable.description || '',
      }
    }
  })

  // Clean up empty collections
  Object.keys(tokens).forEach((key) => {
    if (key.startsWith('$')) return
    if (Object.keys(tokens[key]).length === 0) {
      delete tokens[key]
    }
  })

  return tokens
}

function rgbaToHex(r: number, g: number, b: number, a?: number) {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}${a !== undefined && a < 1 ? toHex(a) : ''}`
  return hex
}

function sanitizeTokenName(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function getTokenType(resolvedType: string) {
  const typeMap: Record<string, string> = {
    COLOR: 'color',
    FLOAT: 'dimension',
    STRING: 'string',
    BOOLEAN: 'boolean',
  }
  return typeMap[resolvedType] || 'other'
}
