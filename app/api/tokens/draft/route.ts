import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DRAFT_DIR  = path.join(process.cwd(), 'design-tokens', 'draft')
const DRAFT_FILE = path.join(DRAFT_DIR, 'draft.css')

export async function POST(req: NextRequest) {
  try {
    const { css } = await req.json()

    if (!css || typeof css !== 'string') {
      return NextResponse.json({ error: 'Missing css string.' }, { status: 400 })
    }

    fs.mkdirSync(DRAFT_DIR, { recursive: true })
    fs.writeFileSync(DRAFT_FILE, css, 'utf-8')

    return NextResponse.json({ success: true, path: DRAFT_FILE })
  } catch (err: any) {
    console.error('[tokens/draft]', err)
    return NextResponse.json({ error: err.message || 'Failed to save draft.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(DRAFT_FILE)) {
      return NextResponse.json({ draft: null })
    }
    const draft = fs.readFileSync(DRAFT_FILE, 'utf-8')
    return NextResponse.json({ draft })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
