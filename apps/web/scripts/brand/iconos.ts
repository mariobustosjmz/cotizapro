/**
 * Genera favicon.ico (16/32/48, versión simplificada) y apple-icon.png (180, versión completa a sangre)
 * a partir de los SVG de marca. Los PNG se incrustan tal cual en el contenedor ICO.
 *   pnpm exec tsx scripts/brand/iconos.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from '@playwright/test'

const APP = path.resolve(__dirname, '../../app')
const FULL = readFileSync(path.join(APP, 'icon.svg'), 'utf8')
const SMALL = readFileSync(path.join(__dirname, 'icon-small.svg'), 'utf8')
const ICO_SIZES = [16, 32, 48] as const

async function render(page: Page, svg: string, size: number, transparent: boolean): Promise<Buffer> {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
  return page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } })
}

/** Contenedor ICO con imágenes PNG: cabecera de 6 bytes + 16 bytes por entrada + datos. */
function buildIco(images: readonly { size: number; png: Buffer }[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

async function main(): Promise<void> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 })
    const icoImages = []
    for (const size of ICO_SIZES) icoImages.push({ size, png: await render(page, SMALL, size, true) })
    writeFileSync(path.join(APP, 'favicon.ico'), buildIco(icoImages))
    // iOS recorta las esquinas por su cuenta: el ícono va cuadrado y sin transparencia.
    const squareFull = FULL.replace(/<rect width="512" height="512" rx="112"/g, '<rect width="512" height="512" rx="0"')
    writeFileSync(path.join(APP, 'apple-icon.png'), await render(page, squareFull, 180, false))
    process.stdout.write(`favicon.ico (${ICO_SIZES.join('/')}) y apple-icon.png (180) generados\n`)
  } finally {
    await browser.close()
  }
}

void main()
