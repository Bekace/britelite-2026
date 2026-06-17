import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const GLOBALS_CSS   = path.join(process.cwd(), 'app', 'globals.css')
const HISTORY_DIR   = path.join(process.cwd(), 'design-tokens', 'history')

// Marker comments that wrap the generated block inside globals.css
const BLOCK_START = '/* Design Tokens — Light */'
const BLOCK_END   = '/* End Design Tokens */'

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

/**
 * Replace (or append) the generated design-token block inside globals.css.
 * Everything between BLOCK_START and BLOCK_END is replaced atomically.
 */
function spliceTokenBlock(existing: string, newBlock: string): string {
  const startIdx = existing.indexOf(BLOCK_START)
  const endIdx   = existing.indexOf(BLOCK_END)

  if (startIdx !== -1 && endIdx !== -1) {
    // Replace existing block
    return (
      existing.slice(0, startIdx) +
      newBlock + '\n' + BLOCK_END +
      existing.slice(endIdx + BLOCK_END.length)
    )
  }

  // Append new block at the end
  return existing.trimEnd() + '\n\n' + newBlock + '\n' + BLOCK_END + '\n'
}

export async function POST(req: NextRequest) {
  try {
    const { css } = await req.json()

    if (!css || typeof css !== 'string') {
      return NextResponse.json({ error: 'Missing css string.' }, { status: 400 })
    }

    // 1. Read current globals.css
    if (!fs.existsSync(GLOBALS_CSS)) {
      return NextResponse.json({ error: 'globals.css not found.' }, { status: 404 })
    }
    const current = fs.readFileSync(GLOBALS_CSS, 'utf-8')

    // 2. Backup current state to history/
    fs.mkdirSync(HISTORY_DIR, { recursive: true })
    const backupFile = path.join(HISTORY_DIR, `${timestamp()}.css`)
    fs.writeFileSync(backupFile, current, 'utf-8')

    // 3. Splice new token block into globals.css
    const updated = spliceTokenBlock(current, css)
    fs.writeFileSync(GLOBALS_CSS, updated, 'utf-8')

    return NextResponse.json({ success: true, backup: backupFile })
  } catch (err: any) {
    console.error('[tokens/apply]', err)
    return NextResponse.json({ error: err.message || 'Failed to apply tokens.' }, { status: 500 })
  }
}
