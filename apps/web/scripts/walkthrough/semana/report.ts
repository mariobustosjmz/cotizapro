/**
 * PDF de la semana simulada a partir de docs/handoff/semana-<env>/semana.json y sus capturas.
 *   pnpm exec tsx scripts/walkthrough/semana/report.ts [prod|local]
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { esc, htmlDoc, pdfFirstPage, printPdf, route, stepSection } from '../render'
import { mxn, type ClientRecord, type DayEntry, type Finding, type QuoteRecord, type WeekStep } from './kit'

interface WeekRun {
  readonly base: string
  readonly env: string
  readonly business: string
  readonly owner: string
  readonly email: string
  readonly slug: string
  readonly dates: readonly string[]
  readonly startedAt: string
  readonly finishedAt: string
  readonly minutes: number
  readonly apiRequests: number
  readonly throttled: number
  readonly pausedSeconds: number
  readonly error?: string
  readonly failedAt?: string
  readonly days: readonly DayEntry[]
  readonly steps: readonly WeekStep[]
  readonly findings: readonly Finding[]
  readonly quotes: readonly QuoteRecord[]
  readonly clients: readonly ClientRecord[]
}

const WEEKDAY = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  const th = head.map((h) => `<th>${esc(h)}</th>`).join('')
  const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
  return `<table class="index"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`
}

function quotesTable(quotes: readonly QuoteRecord[]): string {
  const rows = quotes.map((q) => {
    const pending = Math.max(0, Math.round((q.total - q.paid) * 100) / 100)
    const cls = q.status === 'Cobrada' ? 'ok' : q.status === 'Rechazada' ? 'bad' : pending > 0 && q.paid > 0 ? 'warn' : ''
    return [esc(q.number), esc(q.client), esc(q.kind), `<span class="${cls}">${esc(q.status)}</span>`, mxn(q.total), mxn(q.paid), q.status === 'Rechazada' ? '—' : mxn(pending)]
  })
  const sum = (f: (q: QuoteRecord) => number) => quotes.reduce((a, q) => a + f(q), 0)
  const live = quotes.filter((q) => q.status !== 'Rechazada')
  rows.push(['<b>Total</b>', '', '', '', `<b>${mxn(sum((q) => q.total))}</b>`, `<b>${mxn(sum((q) => q.paid))}</b>`, `<b>${mxn(live.reduce((a, q) => a + Math.max(0, q.total - q.paid), 0))}</b>`])
  return table(['Folio', 'Cliente', 'Tipo de caso', 'Estado final', 'Total', 'Cobrado', 'Por cobrar'], rows)
}

function findingsBlock(findings: readonly Finding[]): string {
  if (!findings.length) return '<p class="muted">Sin hallazgos durante la corrida.</p>'
  const order = { alta: 0, media: 1, baja: 2 } as const
  const rows = [...findings].sort((a, b) => order[a.severity] - order[b.severity]).map((f) => [`<span class="${f.severity === 'alta' ? 'bad' : f.severity === 'media' ? 'warn' : 'muted'}">${f.severity}</span>`, `<b>${esc(f.title)}</b><br>${esc(f.detail)}`, `<code>${esc(f.where)}</code>`])
  return table(['Severidad', 'Hallazgo', 'Dónde'], rows)
}

function cover(run: WeekRun, steps: readonly WeekStep[]): string {
  const host = new URL(run.base).host
  const range = `${run.dates[0]} al ${run.dates[5]}`
  const clients = run.clients.map((c) => [esc(c.company || c.name), esc(c.company ? c.name : ''), esc(c.origin), esc(c.need)])
  const index = steps.map((s) => [String(s.n), `Día&nbsp;${s.day}`, esc(s.area), esc(s.title), `<code>${esc(route(s.url).pattern)}</code>`])
  return `<section class="cover">
    <p class="brand">CotizaPro · Semana real de operación</p>
    <h1>${esc(run.business)}: su primera semana, de cero a cobrar</h1>
    <p class="lead">Simulación de seis días de trabajo de un taller de vidrio y aluminio en <b>${esc(host)}</b>, operada <b>100 % desde la interfaz</b>, igual que lo haría la dueña: sin sembrar datos ni llamar a la API por fuera. Incluye casos sencillos y directos, un proyecto corporativo complejo, un paquete promocional, solicitudes desde la página pública, un rechazo, una negociación, anticipos, liquidaciones, un saldo pendiente, agenda, recordatorios, fotos y reseñas verificadas.</p>
    <table class="cover-meta">
      <tr><th>Entorno</th><td>${esc(run.base)} (${run.env === 'prod' ? 'producción' : 'local'})</td></tr>
      <tr><th>Semana</th><td>${esc(range)} (fechas de agenda y pagos)</td></tr>
      <tr><th>Panel</th><td><a href="${esc(run.base)}/login">${esc(run.base)}/login</a> · usuario <b>${esc(run.email)}</b> · contraseña en <code>docs/handoff/semana-${esc(run.env)}/credenciales.txt</code></td></tr>
      <tr><th>Página</th><td><a href="${esc(run.base)}/p/${esc(run.slug)}">${esc(run.base)}/p/${esc(run.slug)}</a></td></tr>
      <tr><th>Corrida</th><td>${run.minutes} min · ${steps.length} capturas · ${run.apiRequests} peticiones /api · pausas por límite: ${run.pausedSeconds} s · respuestas 429: ${run.throttled}</td></tr>
      ${run.error ? `<tr><th>Error</th><td class="bad">${esc(run.error)} (en ${esc(run.failedAt ?? '')})</td></tr>` : ''}
    </table>
    <h3>Cotizaciones de la semana</h3>${quotesTable(run.quotes)}
    <h3>Clientes y necesidades</h3>${table(['Cliente', 'Contacto', 'Origen', 'Necesidad'], clients)}
    <h3>Hallazgos observados durante la corrida</h3>${findingsBlock(run.findings)}
    <h3>Índice de pasos</h3>${table(['#', 'Día', 'Parte del sistema', 'Paso', 'Ruta'], index)}
  </section>`
}

function chapter(run: WeekRun, d: DayEntry): string {
  const log = d.log.map((l) => `<li>${esc(l)}</li>`).join('')
  return `<section class="chapter">
    <p class="brand">Día ${d.n} · ${WEEKDAY[d.n - 1]} ${esc(d.date)}</p>
    <h1>${esc(d.title)}</h1>
    <p class="lead">${esc(d.summary)}</p>
    <h3>Bitácora del día</h3><ul class="log">${log}</ul>
    <p class="muted">Capturas del día: ${run.steps.filter((s) => s.day === d.n).length}</p>
  </section>`
}

async function main(): Promise<void> {
  const env = process.argv[2] ?? 'prod'
  const dir = path.resolve(__dirname, `../../../../../docs/handoff/semana-${env}`)
  const run: WeekRun = JSON.parse(readFileSync(path.join(dir, 'semana.json'), 'utf8'))
  const steps = run.steps.filter((s) => existsSync(path.join(dir, s.image)))
  const pdfImg = pdfFirstPage(path.join(dir, 'cotizacion-andrea.pdf'))
  const pdfPage = pdfImg
    ? `<section class="step"><div class="head"><span class="num">PDF</span><div><p class="area">Lo que recibe el cliente</p><h2>PDF de la cotización por medidas de Andrea</h2></div></div>
        <table class="meta"><tr><th>Ruta</th><td><code>GET /api/export/quote/[id]</code> (botón "PDF" del detalle)</td></tr><tr><th>Código</th><td><code>apps/web/lib/pdf/QuotePDF.tsx</code></td></tr></table>
        <p class="what">Documento descargado desde la interfaz: partidas con medidas, totales con IVA y lista de materiales.</p>
        <div class="shot"><img src="data:image/png;base64,${pdfImg.toString('base64')}" /></div></section>`
    : ''
  const body = run.days
    .map((d) => chapter(run, d) + steps.filter((s) => s.day === d.n).map((s) => stepSection(dir, s) + (s.id === 'cotizacion-medidas' ? pdfPage : '')).join(''))
    .join('')
  const out = path.join(dir, `semana-cotizapro-${env}.pdf`)
  await printPdf(htmlDoc(cover(run, steps) + body), out, `CotizaPro · semana ${env} · ${run.business}`)
  process.stdout.write(`PDF: ${out}\n`)
}

void main()
