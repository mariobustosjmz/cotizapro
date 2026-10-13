/**
 * Piezas compartidas para convertir capturas de un recorrido en un PDF legible:
 * mapa URL → ruta y archivo de código, bloques de imagen, estilos e impresión con Chromium.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

export interface RenderStep {
  readonly n: number
  readonly title: string
  readonly image: string
  readonly url: string
  readonly area: string
  readonly what: string
  readonly apis: readonly string[]
  readonly facts: Readonly<Record<string, string>>
}

export interface RouteInfo {
  readonly path: string
  readonly query: string
  readonly pattern: string
  readonly file: string
}

const ROUTE_FILES: readonly (readonly [RegExp, string, string])[] = [
  [/^\/signup$/, '/signup', 'app/(auth)/signup/page.tsx'],
  [/^\/p\/[^/]+$/, '/p/[slug]', 'app/p/[slug]/page.tsx'],
  [/^\/r\/[^/]+$/, '/r/[token]', 'app/r/[token]/page.tsx'],
  [/^\/dashboard\/quotes\/new$/, '/dashboard/quotes/new', 'app/(dashboard)/dashboard/quotes/new/page.tsx'],
  [/^\/dashboard\/quotes\/[0-9a-f-]{36}$/, '/dashboard/quotes/[id]', 'app/(dashboard)/dashboard/quotes/[id]/page.tsx'],
  [/^\/dashboard\/quotes\/[0-9a-f-]{36}\/edit$/, '/dashboard/quotes/[id]/edit', 'app/(dashboard)/dashboard/quotes/[id]/edit/page.tsx'],
  [/^\/dashboard\/clients\/[0-9a-f-]{36}$/, '/dashboard/clients/[id]', 'app/(dashboard)/dashboard/clients/[id]/page.tsx'],
  [/^\/dashboard\/reminders\/[0-9a-f-]{36}$/, '/dashboard/reminders/[id]', 'app/(dashboard)/dashboard/reminders/[id]/page.tsx'],
  [/^\/dashboard\/calendar\/[0-9a-f-]{36}\/edit$/, '/dashboard/calendar/[id]/edit', 'app/(dashboard)/dashboard/calendar/[id]/edit/page.tsx'],
]

export function route(url: string): RouteInfo {
  const u = new URL(url)
  const hit = ROUTE_FILES.find(([re]) => re.test(u.pathname))
  if (hit) return { path: u.pathname, query: u.search, pattern: hit[1], file: `apps/web/${hit[2]}` }
  const file = u.pathname.startsWith('/dashboard') ? `apps/web/app/(dashboard)${u.pathname}/page.tsx` : ''
  return { path: u.pathname, query: u.search, pattern: u.pathname, file }
}

export const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

function pngSize(buf: Buffer): { w: number; h: number } {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
}

/** Las capturas muy altas (página completa en celular) se reparten en columnas que caben en una hoja. */
export function imageBlock(buf: Buffer): string {
  const b64 = buf.toString('base64')
  const { w, h } = pngSize(buf)
  if (h / w < 2.2) return `<div class="shot"><img src="data:image/png;base64,${b64}" /></div>`
  const maxColH = 640
  const usableW = 680
  const gap = 12
  let cols = 2
  let colW = 0
  let colH = 0
  for (; cols <= 5; cols += 1) {
    colW = Math.floor(Math.min(330, (usableW - gap * (cols - 1)) / cols))
    colH = Math.ceil((h * colW) / w / cols)
    if (colH <= maxColH) break
  }
  const col = (i: number) => `<div class="col" style="width:${colW}px;height:${colH}px"><img style="width:${colW}px;margin-top:-${i * colH}px" src="data:image/png;base64,${b64}" /></div>`
  return `<div class="shot split">${Array.from({ length: cols }, (_, i) => col(i)).join('')}</div>`
}

/** Primera página de un PDF como PNG (solo macOS, con PDFKit). Devuelve null si no se puede. */
export function pdfFirstPage(pdfPath: string): Buffer | null {
  if (!existsSync(pdfPath)) return null
  const png = path.join(path.dirname(pdfPath), `${path.basename(pdfPath, '.pdf')}-p1.png`)
  try {
    const stale = !existsSync(png) || statSync(png).mtimeMs < statSync(pdfPath).mtimeMs
    if (stale) execFileSync('swift', [path.join(__dirname, 'pdf2png.swift'), pdfPath, path.dirname(pdfPath), '1'], { stdio: 'ignore' })
    return existsSync(png) ? readFileSync(png) : null
  } catch {
    return null
  }
}

export function factsRows(facts: Readonly<Record<string, string>>): string {
  return Object.entries(facts).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')
}

export function stepSection(dir: string, s: RenderStep, badge: string = String(s.n)): string {
  const r = route(s.url)
  const apis = s.apis.map((a) => `<li><code>${esc(a)}</code></li>`).join('')
  return `<section class="step">
    <div class="head"><span class="num">${esc(badge)}</span><div><p class="area">${esc(s.area)}</p><h2>${esc(s.title)}</h2></div></div>
    <table class="meta">
      <tr><th>URL</th><td><a href="${esc(s.url)}">${esc(s.url)}</a></td></tr>
      <tr><th>Ruta</th><td><code>${esc(r.pattern)}</code>${r.query ? ` <span class="muted">${esc(r.query)}</span>` : ''}</td></tr>
      ${r.file ? `<tr><th>Código</th><td><code>${esc(r.file)}</code></td></tr>` : ''}
      ${factsRows(s.facts)}
    </table>
    ${s.what ? `<p class="what">${esc(s.what)}</p>` : ''}
    ${apis ? `<p class="label">Endpoints que intervienen</p><ul class="apis">${apis}</ul>` : ''}
    ${imageBlock(readFileSync(path.join(dir, s.image)))}
  </section>`
}

export const CSS = `
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111827; font-size: 10.5px; margin: 0; }
  h1 { font-size: 24px; margin: 0 0 6px; } h2 { font-size: 15px; margin: 2px 0 0; } h3 { font-size: 13px; margin: 14px 0 4px; }
  .cover { page-break-after: always; }
  .brand { color: #ea580c; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; font-size: 11px; }
  .lead { font-size: 12px; color: #374151; line-height: 1.5; }
  .muted { color: #6b7280; }
  table { border-collapse: collapse; width: 100%; }
  .meta th, .cover-meta th { text-align: left; width: 70px; color: #6b7280; font-weight: 600; vertical-align: top; padding: 2px 8px 2px 0; }
  .meta td, .cover-meta td { padding: 2px 0; word-break: break-all; }
  .index { margin-top: 10px; } .index th { text-align: left; background: #fff7ed; color: #9a3412; padding: 5px; font-size: 10px; }
  .index td { border-bottom: 1px solid #f3f4f6; padding: 4px 5px; vertical-align: top; }
  code { font-family: Menlo, monospace; font-size: 9.5px; background: #f3f4f6; padding: 1px 4px; border-radius: 3px; }
  a { color: #c2410c; text-decoration: none; }
  .step, .chapter { page-break-before: always; }
  .head { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
  .num { background: #f97316; color: #fff; font-weight: 700; border-radius: 999px; min-width: 28px; height: 28px; padding: 0 6px; display: grid; place-items: center; font-size: 12px; flex: none; }
  .area { margin: 0; color: #ea580c; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: .03em; }
  .what { font-size: 11.5px; line-height: 1.5; margin: 8px 0; }
  .label { margin: 6px 0 2px; color: #6b7280; font-weight: 600; }
  .apis { margin: 0 0 8px; padding-left: 16px; }
  .shot { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; text-align: center; background: #f9fafb; }
  .shot img { max-width: 100%; max-height: 182mm; object-fit: contain; display: block; margin: 0 auto; }
  .shot.split { display: flex; justify-content: center; gap: 12px; padding: 10px; background: #f3f4f6; }
  .shot.split .col { overflow: hidden; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.15); background: #fff; }
  .shot.split .col img { max-width: none; max-height: none; }
  .legend { margin-top: 10px; font-size: 10px; color: #4b5563; }
  .ok { color: #15803d; font-weight: 600; } .warn { color: #b45309; font-weight: 600; } .bad { color: #b91c1c; font-weight: 600; }
  ul.log { margin: 4px 0 10px; padding-left: 16px; line-height: 1.5; font-size: 11px; }
`

export async function printPdf(html: string, out: string, footer: string): Promise<void> {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="font-size:8px;color:#9ca3af;width:100%;text-align:center">${esc(footer)} · <span class="pageNumber"></span>/<span class="totalPages"></span></div>`,
  })
  await browser.close()
}

export function htmlDoc(body: string): string {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`
}
