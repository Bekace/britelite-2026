import { NextResponse } from 'next/server'

function rgbaToHex(r: number, g: number, b: number, a: number = 1): string {
  const toHex = (n: number) => {
    const hex = n.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  const hex = `#${toHex(Math.round(r * 255))}${toHex(Math.round(g * 255))}${toHex(Math.round(b * 255))}`

  if (a < 1) {
    return hex + toHex(Math.round(a * 255))
  }

  return hex
}

function generateCSS(tokens: any): string {
  let css = `/* Auto-generated Design Tokens */
:root {
`

  Object.entries(tokens).forEach(([group, items]: [string, any]) => {
    if (group.startsWith('$')) return

    Object.entries(items).forEach(([name, value]: [string, any]) => {
      const actualValue = typeof value === 'object' ? value.$value : value
      const cssName = `--${group}-${name}`.replace(/([A-Z])/g, '-$1').toLowerCase()
      css += `  ${cssName}: ${actualValue};\n`
    })
  })

  css += `}\n`
  return css
}

function generateTailwindConfig(tokens: any): Record<string, any> {
  const config: any = {
    extend: {
      colors: {},
      spacing: {},
      borderRadius: {},
      fontSize: {},
    },
  }

  Object.entries(tokens).forEach(([group, items]: [string, any]) => {
    if (group.startsWith('$')) return

    Object.entries(items).forEach(([name, value]: [string, any]) => {
      const actualValue = typeof value === 'object' ? value.$value : value
      const tailwindKey = name.replace(/([A-Z])/g, '-$1').toLowerCase()

      if (group === 'colors') {
        config.extend.colors[tailwindKey] = `var(--${group}-${name})`
      } else if (group === 'spacing' || group === 'space' || group === 'padding' || group === 'margin' || group === 'gap') {
        config.extend.spacing[tailwindKey] = `var(--${group}-${name})`
      } else if (group === 'radius' || group === 'borderRadius') {
        config.extend.borderRadius[tailwindKey] = `var(--${group}-${name})`
      } else if (group === 'text' || group === 'typography' || group === 'fontSize') {
        config.extend.fontSize[tailwindKey] = `var(--${group}-${name})`
      }
    })
  })

  return config
}

function generateTypeScript(tokens: any): string {
  let ts = `/* Auto-generated Token Types */

export const DESIGN_TOKENS = {
`

  Object.entries(tokens).forEach(([group, items]: [string, any]) => {
    if (group.startsWith('$')) return

    ts += `  ${group}: {\n`

    Object.entries(items).forEach(([name, value]: [string, any]) => {
      const actualValue = typeof value === 'object' ? value.$value : value
      ts += `    ${name}: 'var(--${group}-${name})',\n`
    })

    ts += `  },\n`
  })

  ts += `} as const\n\n`
  ts += `export type DesignToken = typeof DESIGN_TOKENS\n`

  return ts
}

export async function POST(request: Request) {
  try {
    const tokensData = await request.json()

    if (!tokensData) {
      return NextResponse.json({ error: 'No tokens provided' }, { status: 400 })
    }

    const css = generateCSS(tokensData)
    const tailwind = generateTailwindConfig(tokensData)
    const typescript = generateTypeScript(tokensData)

    return NextResponse.json({
      success: true,
      message: 'Tokens transformed successfully',
      css,
      tailwind,
      typescript,
    })
  } catch (error) {
    console.error('Error transforming tokens:', error)
    return NextResponse.json({ error: 'Failed to transform tokens', success: false }, { status: 500 })
  }
}
