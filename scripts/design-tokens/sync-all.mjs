#!/usr/bin/env node

/**
 * Master Design Token Sync Script
 * Runs both Figma sync and token transformation in sequence
 * Usage: node scripts/design-tokens/sync-all.mjs
 */

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '../../')

function runScript(scriptPath, name) {
  return new Promise((resolve, reject) => {
    console.log(`\n📌 Running ${name}...`)
    
    const process = spawn('node', [scriptPath], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    })

    process.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${name} failed with code ${code}`))
      }
    })

    process.on('error', reject)
  })
}

async function main() {
  console.log('🎨 Starting Complete Design Token Sync Pipeline...\n')

  try {
    // Step 1: Sync from Figma
    await runScript(
      path.join(ROOT_DIR, 'scripts/figma/sync-figma-tokens.mjs'),
      'Figma Sync'
    )

    // Step 2: Transform tokens
    await runScript(
      path.join(ROOT_DIR, 'scripts/design-tokens/transform-tokens.mjs'),
      'Token Transform'
    )

    console.log('\n✅ Design Token Pipeline Completed Successfully!')
    console.log('\n📋 Next steps:')
    console.log('  1. Check design-tokens/tokens.json for extracted tokens')
    console.log('  2. Check app/globals.css for CSS variables')
    console.log('  3. Import from design-tokens/tokens.ts in your components')
    console.log('  4. Use tailwind-config.json for Tailwind integration')
  } catch (error) {
    console.error('\n❌ Pipeline failed:', error.message)
    process.exit(1)
  }
}

main()
