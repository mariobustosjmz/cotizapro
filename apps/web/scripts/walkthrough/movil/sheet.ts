/**
 * Hojas de contacto de la auditoría móvil: N capturas por imagen para revisión visual rápida.
 *   pnpm exec tsx scripts/walkthrough/movil/sheet.ts <outDir> <device> [porHoja]
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

interface Row {
  readonly device: string
  readonly route: string
  readonly image: string
  readonly overflowPx: number
}

async function main(): Promise<void> {
  const dir = path.resolve(process.argv[2])
  const device = process.argv[3]
  const perSheet = Number(process.argv[4] ?? 6)
  const rows = (JSON.parse(readFileSync(path.join(dir, 'audit.json'), 'utf8')).results as Row[]).filter((r) => r.device === device && r.image)
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1800, height: 1400 } })
  for (let i = 0; i < rows.length; i += perSheet) {
    const cells = rows.slice(i, i + perSheet).map((r) => {
      const src = `data:image/png;base64,${readFileSync(path.join(dir, r.image)).toString('base64')}`
      return `<figure><figcaption>${r.route}${r.overflowPx ? ` · desborde ${r.overflowPx}px` : ''}</figcaption><div class="clip"><img src="${src}"></div></figure>`
    }).join('')
    await page.setContent(`<style>body{margin:8px;font:14px system-ui;display:grid;grid-template-columns:repeat(${perSheet},1fr);gap:8px;background:#ddd}
      figure{margin:0;background:#fff}figcaption{padding:4px;font-weight:600;background:#222;color:#fff}.clip{max-height:1300px;overflow:hidden}img{width:100%;display:block}</style>${cells}`)
    const out = path.join(dir, `hoja-${device}-${String(i / perSheet + 1).padStart(2, '0')}.png`)
    await page.screenshot({ path: out, fullPage: true })
    process.stdout.write(`${out}\n`)
  }
  await browser.close()
}

void main()
