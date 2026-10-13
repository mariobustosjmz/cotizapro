/**
 * Convierte los logos de ejemplo (scripts/seed/data/logos/*.svg) a PNG de 512 px: el bucket brand-assets
 * solo acepta imágenes rasterizadas.
 *   pnpm exec tsx scripts/brand/logos-ejemplo.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const DIR = path.resolve(__dirname, '../seed/data/logos')
const SIZE = 512

async function main(): Promise<void> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 })
    for (const file of readdirSync(DIR).filter((f) => f.endsWith('.svg'))) {
      const svg = readFileSync(path.join(DIR, file), 'utf8').replace('<svg ', `<svg width="${SIZE}" height="${SIZE}" `)
      await page.setContent(`<html><body style="margin:0">${svg}</body></html>`)
      const png = await page.screenshot({ clip: { x: 0, y: 0, width: SIZE, height: SIZE } })
      writeFileSync(path.join(DIR, file.replace(/\.svg$/, '.png')), png)
      process.stdout.write(`${file} → ${file.replace(/\.svg$/, '.png')} (${png.length} bytes)\n`)
    }
  } finally {
    await browser.close()
  }
}

void main()
