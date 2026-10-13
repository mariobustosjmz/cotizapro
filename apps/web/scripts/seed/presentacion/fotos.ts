/**
 * Genera las ilustraciones (PNG 800x600) del caso de presentación de MEGAGLASS.
 * Se corre una vez en local; los PNG quedan versionados junto al seed para que el servidor no necesite navegador.
 *   pnpm exec tsx scripts/seed/presentacion/fotos.ts
 */
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const W = 800
const H = 600

const wallTiles = (color: string): string =>
  Array.from({ length: 10 }, (_, i) => Array.from({ length: 8 }, (_, j) => `<rect x="${i * 80}" y="${j * 66}" width="80" height="66" fill="${color}" stroke="#d6d3d1" stroke-width="2"/>`).join('')).join('')

const floor = '<rect x="0" y="500" width="800" height="100" fill="#a8a29e"/><line x1="0" y1="500" x2="800" y2="500" stroke="#78716c" stroke-width="4"/>'

const badge = (title: string): string => `
  <rect x="0" y="0" width="800" height="54" fill="rgba(15,23,42,0.78)"/>
  <text x="22" y="36" font-family="Helvetica, Arial" font-size="26" font-weight="700" fill="#fff">${title}</text>
  <rect x="560" y="556" width="228" height="32" rx="6" fill="rgba(255,255,255,0.85)"/>
  <text x="674" y="578" text-anchor="middle" font-family="Helvetica, Arial" font-size="15" fill="#334155">Ilustración de ejemplo</text>`

const glass = (x: number, y: number, w: number, h: number): string => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(147,197,253,0.38)" stroke="#94a3b8" stroke-width="3"/>
  <line x1="${x + w * 0.15}" y1="${y + h * 0.1}" x2="${x + w * 0.45}" y2="${y + h * 0.4}" stroke="rgba(255,255,255,0.8)" stroke-width="6"/>
  <line x1="${x + w * 0.2}" y1="${y + h * 0.3}" x2="${x + w * 0.35}" y2="${y + h * 0.45}" stroke="rgba(255,255,255,0.6)" stroke-width="3"/>`

const shower = '<rect x="250" y="390" width="300" height="110" fill="#e2e8f0"/><circle cx="470" cy="150" r="22" fill="#64748b"/><rect x="465" y="90" width="10" height="60" fill="#64748b"/>'

const window = (x: number, y: number, w: number, h: number, frame: string): string => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#bae6fd" stroke="${frame}" stroke-width="12"/>
  <line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${frame}" stroke-width="10"/>
  <line x1="${x + 20}" y1="${y + 20}" x2="${x + w / 2 - 30}" y2="${y + h / 2}" stroke="rgba(255,255,255,0.7)" stroke-width="5"/>`

const cracks = (cx: number, cy: number): string =>
  [[-120, -90], [110, -70], [90, 110], [-80, 120], [-140, 20], [150, 30]].map(([dx, dy]) => `<polyline points="${cx},${cy} ${cx + dx! * 0.5},${cy + dy! * 0.45} ${cx + dx!},${cy + dy!}" fill="none" stroke="#f8fafc" stroke-width="3"/>`).join('')

const SCENES: Readonly<Record<string, string>> = {
  'bano-antes': `${wallTiles('#f5f5f4')}${floor}${shower}
    <rect x="230" y="70" width="12" height="430" fill="#a3a3a3"/><rect x="200" y="64" width="380" height="10" fill="#737373"/>
    <path d="M206 74 q20 210 0 420 h70 q-20 -210 0 -420z" fill="#fde68a" opacity="0.85"/><path d="M276 74 q20 210 0 420 h60 q-20 -210 0 -420z" fill="#fcd34d" opacity="0.85"/>
    ${badge('Antes · baño con cortina')}`,
  'bano-despues': `${wallTiles('#f5f5f4')}${floor}${shower}
    ${glass(230, 70, 170, 430)}${glass(390, 70, 170, 430)}
    <rect x="226" y="64" width="340" height="10" rx="4" fill="#475569"/><rect x="380" y="250" width="8" height="90" rx="3" fill="#334155"/>
    ${badge('Después · cancel templado 9 mm corredizo')}`,
  'restaurante-antes': `<rect width="800" height="600" fill="#57534e"/>${floor}
    <rect x="120" y="90" width="560" height="410" fill="#1e293b" stroke="#a8a29e" stroke-width="14"/>${cracks(400, 280)}
    <rect x="150" y="440" width="180" height="40" fill="#f59e0b"/><text x="240" y="467" text-anchor="middle" font-family="Helvetica" font-size="20" fill="#1c1917">CUIDADO</text>
    ${badge('Antes · aparador con vidrio estrellado')}`,
  'restaurante-despues': `<rect width="800" height="600" fill="#57534e"/>${floor}
    <rect x="120" y="90" width="560" height="410" fill="#bae6fd" stroke="#a8a29e" stroke-width="14"/>
    <line x1="170" y1="130" x2="330" y2="300" stroke="rgba(255,255,255,0.8)" stroke-width="8"/>
    <text x="400" y="320" text-anchor="middle" font-family="Georgia" font-size="46" fill="#7c2d12" opacity="0.8">La Nogalera</text>
    ${badge('Después · vidrio claro 6 mm instalado')}`,
  'oficina-obra': `<rect width="800" height="600" fill="#e7e5e4"/>${floor}
    ${window(70, 120, 300, 260, '#111827')}<rect x="430" y="120" width="300" height="260" fill="#d6d3d1" stroke="#a8a29e" stroke-width="6" stroke-dasharray="14 10"/>
    <line x1="560" y1="500" x2="640" y2="190" stroke="#ca8a04" stroke-width="10"/><line x1="610" y1="500" x2="690" y2="190" stroke="#ca8a04" stroke-width="10"/>
    ${[0, 1, 2, 3, 4].map((i) => `<line x1="${574 + i * 15}" y1="${445 - i * 60}" x2="${624 + i * 15}" y2="${445 - i * 60}" stroke="#ca8a04" stroke-width="7"/>`).join('')}
    ${badge('En obra · ventanas serie 3 negro, etapa 1')}`,
  'oficina-avance': `<rect width="800" height="600" fill="#e7e5e4"/>${floor}
    ${window(70, 120, 300, 260, '#111827')}${window(430, 120, 300, 260, '#111827')}
    ${badge('Avance · etapa 1 terminada')}`,
  'cantu-despues': `${wallTiles('#e0f2fe')}${floor}${shower}
    ${glass(260, 70, 280, 430)}<rect x="252" y="140" width="14" height="40" rx="3" fill="#334155"/><rect x="252" y="390" width="14" height="40" rx="3" fill="#334155"/>
    <rect x="510" y="270" width="10" height="70" rx="3" fill="#334155"/>
    ${badge('Terminado · puerta abatible 10 mm')}`,
  'elizondo-despues': `<rect width="800" height="600" fill="#fef3c7"/>${floor}
    <polygon points="60,180 400,70 740,180" fill="#b45309"/><rect x="90" y="180" width="620" height="320" fill="#fde68a"/>
    ${window(140, 240, 200, 170, '#f8fafc')}${window(460, 240, 200, 170, '#f8fafc')}
    ${badge('Terminado · ventanas y cancel, Casa Elizondo')}`,
  'gimnasio-espejos': `<rect width="800" height="600" fill="#1f2937"/>${floor}
    ${[0, 1, 2].map((i) => `<rect x="${70 + i * 225}" y="90" width="210" height="400" fill="#cbd5e1" stroke="#94a3b8" stroke-width="4"/><line x1="${90 + i * 225}" y1="120" x2="${180 + i * 225}" y2="260" stroke="#fff" stroke-width="6" opacity="0.7"/>`).join('')}
    ${badge('Referencia · muro de espejos 6 mm')}`,
}

async function main(): Promise<void> {
  const out = path.resolve(__dirname, 'fotos')
  mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: W, height: H } })
  for (const [name, body] of Object.entries(SCENES)) {
    await page.setContent(`<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg></body></html>`)
    await page.screenshot({ path: path.join(out, `${name}.png`), clip: { x: 0, y: 0, width: W, height: H } })
    process.stdout.write(`${name}.png\n`)
  }
  await browser.close()
}

void main()
