import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const GLOBALS_CSS = path.join(process.cwd(), 'app', 'globals.css')
const HISTORY_DIR = path.join(process.cwd(), 'design-tokens', 'history')

export async function POST() {
  try {
    if (!fs.existsSync(HISTORY_DIR)) {
      return NextResponse.json({ error: 'No backup history found.' }, { status: 404 })
    }

    // Find the most recent backup file
    const files = fs
      .readdirSync(HISTORY_DIR)
      .filter(f => f.endsWith('.css'))
      .sort()
      .reverse()

    if (files.length === 0) {
      return NextResponse.json({ error: 'No backups available to rollback to.' }, { status: 404 })
    }

    const latestBackup = path.join(HISTORY_DIR, files[0])
    const backupContent = fs.readFileSync(latestBackup, 'utf-8')

    // Restore globals.css from backup
    fs.writeFileSync(GLOBALS_CSS, backupContent, 'utf-8')

    // Remove the backup we just restored (it is now the live state)
    fs.unlinkSync(latestBackup)

    return NextResponse.json({
      success: true,
      restoredFrom: files[0],
      remainingBackups: files.length - 1,
    })
  } catch (err: any) {
    console.error('[tokens/rollback]', err)
    return NextResponse.json({ error: err.message || 'Rollback failed.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(HISTORY_DIR)) {
      return NextResponse.json({ backups: [] })
    }

    const backups = fs
      .readdirSync(HISTORY_DIR)
      .filter(f => f.endsWith('.css'))
      .sort()
      .reverse()
      .map(f => ({
        filename: f,
        timestamp: f.replace('.css', '').replace(/-/g, ':').slice(0, 19),
      }))

    return NextResponse.json({ backups })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
