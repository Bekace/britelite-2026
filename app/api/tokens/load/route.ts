import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const tokensPath = path.join(process.cwd(), 'design-tokens', 'tokens.json')

    if (!fs.existsSync(tokensPath)) {
      return NextResponse.json({ error: 'tokens.json not found' }, { status: 404 })
    }

    const tokensData = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'))

    return NextResponse.json({
      success: true,
      tokens: tokensData,
    })
  } catch (error) {
    console.error('Error loading tokens:', error)
    return NextResponse.json({ error: 'Failed to load tokens' }, { status: 500 })
  }
}
