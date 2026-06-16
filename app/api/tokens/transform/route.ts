import { NextRequest, NextResponse } from 'next/server'

function rgbaToHex(r: number, g: number, b: number, a: number = 1): string {
  const toHex = (n: number) => {
    const hex = n.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  const alpha = a < 1 ? toHex(Math.round(a * 255)) : ''
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${alpha}`.toUpperCase()
}

function generateCSSVariables(tokens: any): string {
  let css = ':root {\n  /* Design Tokens - Auto Generated */\n'

  function processTokens(obj: any, prefix = '') {
    Object.entries(obj).forEach(([key, value]: [string, any]) => {
      if (typeof value === 'object' && value !== null && !('$value' in value)) {
        processTokens(value, prefix ? `${prefix}-${key}` : key)
      } else {
        const varValue = value?.$value || value
        const cssVarName = prefix ? `${prefix}-${key}` : key
        css += `  --${cssVarName}: ${varValue};\n`
      }
    })
  }

  processTokens(tokens)
  css += '}\n'
  return css
}

function generateTailwindConfig(tokens: any): string {
  const config: any = {}

  function processTokens(obj: any, category = '') {
    Object.entries(obj).forEach(([key, value]: [string, any]) => {
      if (typeof value === 'object' && value !== null && !('$value' in value)) {
        processTokens(value, key)
      } else {
        const varValue = value?.$value || value
        const varName = category ? `${category}-${key}` : key

        if (category === 'colors') {
          if (!config.colors) config.colors = {}
          config.colors[key] = varValue
        } else if (category === 'space' || category === 'spacing') {
          if (!config.spacing) config.spacing = {}
          config.spacing[key] = varValue
        } else if (category === 'radius') {
          if (!config.borderRadius) config.borderRadius = {}
          config.borderRadius[key] = varValue
        } else {
          if (!config.extend) config.extend = {}
          if (!config.extend[category]) config.extend[category] = {}
          config.extend[category][key] = varValue
        }
      }
    })
  }

  processTokens(tokens)
  return JSON.stringify(config, null, 2)
}

function generateTypeScript(tokens: any): string {
  let ts = 'export const designTokens = {\n'

  function processTokens(obj: any, indent = '  ') {
    Object.entries(obj).forEach(([key, value]: [string, any]) => {
      if (typeof value === 'object' && value !== null && !('$value' in value)) {
        ts += `${indent}${key}: {\n`
        processTokens(value, indent + '  ')
        ts += `${indent}},\n`
      } else {
        const varValue = value?.$value || value
        ts += `${indent}${key}: '${varValue}',\n`
      }
    })
  }

  processTokens(tokens)
  ts += '} as const\n\nexport type DesignTokens = typeof designTokens\n'
  return ts
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { tokens } = body

    if (!tokens || typeof tokens !== 'object') {
      return NextResponse.json(
        { error: 'Invalid tokens format' },
        { status: 400 }
      )
    }

    const css = generateCSSVariables(tokens)
    const tailwind = generateTailwindConfig(tokens)
    const typescript = generateTypeScript(tokens)

    return NextResponse.json({
      css,
      tailwind,
      typescript,
    })
  } catch (error) {
    console.error('Transform error:', error)
    return NextResponse.json(
      { error: 'Failed to transform tokens' },
      { status: 500 }
    )
  }
}
