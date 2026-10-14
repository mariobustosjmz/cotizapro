/**
 * PDF de evidencia D1 + D2 a partir de docs/handoff/evidencia-d1-d2/steps.json y sus capturas.
 *   pnpm exec tsx scripts/walkthrough/d1-d2/documento.ts
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { CSS, esc, factsRows, imageBlock, printPdf, route } from '../render'
import { OUT_DIR, type Run, type Step } from './kit'
import { EXCEPTIONS, INFO, SCENES, SUMMARY, VERIFICATION, type StepInfo } from './contenido'
import { OBSERVATIONS } from './observaciones'

const BRANCH = 'feature/plataforma-motor-vitrina'
const COMMITS_D1 = ['ccf042e', '9f742f3', 'c22e22c']
const COMMITS_D2 = ['29e8692', '6b5432a', '9cb5ccb']

const EXTRA_CSS = `
  .summary dt { font-weight: 700; color: #9a3412; margin-top: 8px; font-size: 11.5px; } .summary dd { margin: 2px 0 0; font-size: 11px; line-height: 1.5; }
  .data { margin: 6px 0 8px; } .data th { text-align: left; width: 150px; color: #6b7280; font-weight: 600; vertical-align: top; padding: 3px 8px 3px 0; border-bottom: 1px solid #f3f4f6; }
  .data td { padding: 3px 0; border-bottom: 1px solid #f3f4f6; word-break: break-word; }
  .grid th, .grid td { border-bottom: 1px solid #f3f4f6; padding: 5px; text-align: left; vertical-align: top; font-size: 10px; }
  .grid thead th { background: #fff7ed; color: #9a3412; }
  .part { display: inline-block; background: #111827; color: #fff; border-radius: 4px; padding: 1px 6px; font-size: 9.5px; margin-right: 6px; }
  .page { page-break-before: always; } .codes { margin: 0 0 6px; padding-left: 16px; }
  .step .shot { margin: 6px 0 10px; page-break-inside: avoid; } .step .shot img { max-height: 145mm; } .tech th { width: 70px; } .tech td code { font-size: 8.5px; line-height: 1.8; display: inline-block; margin: 0 4px 2px 0; } .step .shot.split { zoom: 0.82; } .step .what { font-size: 11px; margin: 6px 0; }
  .step .meta { margin-top: 4px; }
`

const maskToken = (value: string): string =>
  value.replace(/\/c\/([a-f0-9]{8})[a-f0-9]{48}([a-f0-9]{8})/g, '/c/$1…$2').replace(/c%2F([a-f0-9]{8})[a-f0-9]{48}([a-f0-9]{8})/g, 'c%2F$1…$2')

const maskFacts = (facts: Readonly<Record<string, string>>): Record<string, string> =>
  Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, maskToken(v)]))

const fmtDate = (iso: string): string => new Date(iso).toLocaleString('es-MX', { timeZone: 'America/Monterrey', dateStyle: 'long', timeStyle: 'short' })

function info(s: Step): StepInfo {
  return INFO[s.id] ?? { area: '', what: '', apis: [], code: [] }
}

function cover(run: Run): string {
  const rows = run.steps.map((s) => {
    const scene = SCENES.find((x) => x.n === s.scene)
    return `<tr><td>${s.n}</td><td><span class="part">${esc(scene?.part ?? '')}</span>${esc(scene?.title ?? '')}</td><td>${esc(s.title)}</td><td>${esc(s.device)}</td></tr>`
  }).join('')
  return `<section class="cover">
    <p class="brand">CotizaPro · Evidencia visual</p>
    <h1>Evidencia D1 + D2 — CotizaPro</h1>
    <p class="lead">Recorrido real por la interfaz, con los datos demo de la base local: Megaglass envía una cotización, su cliente la acepta desde el celular y ve el anticipo; después, el superadmin suspende y renueva el plan de Plomería Don Beto, y se ve qué le pasa a esa cuenta en cada momento. Cada página trae la captura, qué se ve, los datos leídos de la pantalla, la ruta y el código.</p>
    <table class="cover-meta">
      <tr><th>Fecha</th><td>${esc(fmtDate(run.finishedAt || run.startedAt))}</td></tr>
      <tr><th>Rama</th><td><code>${BRANCH}</code></td></tr>
      <tr><th>D1</th><td>${COMMITS_D1.map((c) => `<code>${c}</code>`).join(' ')} · cotización pública con Aceptar y anticipo</td></tr>
      <tr><th>D2</th><td>${COMMITS_D2.map((c) => `<code>${c}</code>`).join(' ')} · cobro semi-manual, solo lectura y superadmin</td></tr>
      <tr><th>Entorno</th><td>${esc(run.base)} (servidor de desarrollo local) · Supabase local</td></tr>
      <tr><th>Cuentas</th><td>direccion@megaglass.demo.cotizapro.mx (MEGAGLASS Demo, dueño) · beto@plomeria.demo.cotizapro.mx (Plomería Don Beto, plan Taller)</td></tr>
      <tr><th>Capturas</th><td>${run.steps.length} · escritorio 1280 × 900, celular 390 × 844</td></tr>
    </table>
    <h3>Índice de capturas</h3>
    <table class="index"><thead><tr><th>#</th><th>Escena</th><th>Captura</th><th>Vista</th></tr></thead><tbody>${rows}</tbody></table>
  </section>`
}

function summary(): string {
  const items = SUMMARY.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')
  return `<section class="page"><p class="brand">Resumen</p><h2>Qué hay de nuevo, en palabras del negocio</h2>
    <dl class="summary">${items}</dl>
    <h3>Cómo se hizo este recorrido</h3>
    <ul class="log">
      <li>Todos los cambios de estado se hicieron con clics y texto en la interfaz, con Playwright, como lo haría una persona: login por /login, botones, diálogos y formularios.</li>
      <li>Los totales, estados, ligas (incluido el href de wa.me) y la liga pública se leyeron del DOM. En este PDF la liga /c/… aparece recortada; la completa está en steps.json.</li>
      <li>Las únicas excepciones están en la sección «Excepciones al recorrido solo-UI».</li>
    </ul></section>`
}

function stepPage(s: Step): string {
  const i = info(s)
  const scene = SCENES.find((x) => x.n === s.scene)
  const isEmail = s.url.startsWith('about:')
  const r = isEmail ? null : route(s.url)
  const codes = [...new Set([...(r?.file ? [r.file] : []), ...i.code])].map((c) => `<code>${esc(c)}</code>`).join(' ')
  const apis = i.apis.map((a) => `<code>${esc(a)}</code>`).join(' ')
  const urlRow = isEmail
    ? '<tr><th>URL</th><td>Vista previa local del HTML (sin URL)</td></tr>'
    : `<tr><th>URL</th><td>${esc(maskToken(s.url))}</td></tr><tr><th>Ruta</th><td><code>${esc(r?.pattern ?? '')}</code></td></tr>`
  return `<section class="step">
    <div class="head"><span class="num">${s.n}</span><div><p class="area"><span class="part">${esc(scene?.part ?? '')}</span>Escena ${s.scene} · ${esc(i.area)}</p><h2>${esc(s.title)}</h2></div></div>
    <p class="what"><b>Qué ves:</b> ${esc(i.what)}</p>
    ${imageBlock(readFileSync(path.join(OUT_DIR, s.image)))}
    <p class="label">Datos leídos de la pantalla</p>
    <table class="data">${factsRows(maskFacts(s.facts))}</table>
    <table class="meta tech">${urlRow}<tr><th>Vista</th><td>${esc(s.device)} · ${esc(fmtDate(s.at))}</td></tr>
      ${apis ? `<tr><th>Endpoints</th><td>${apis}</td></tr>` : ''}${codes ? `<tr><th>Código</th><td>${codes}</td></tr>` : ''}</table>
  </section>`
}

interface OrgState {
  readonly plan?: string
  readonly subscription_status?: string
  readonly current_period_end?: string | null
  readonly billing_provider?: string | null
  readonly billing_reference?: string | null
}

function stateRow(label: string, st: OrgState | undefined): string {
  const v = (x: string | null | undefined): string => (x === null || x === undefined ? 'NULL' : x)
  return `<tr><td>${esc(label)}</td><td>${esc(v(st?.plan))}</td><td>${esc(v(st?.subscription_status))}</td><td>${esc(v(st?.current_period_end))}</td><td>${esc(v(st?.billing_provider))}</td><td>${esc(v(st?.billing_reference))}</td></tr>`
}

function beforeAfter(run: Run): string {
  const rec = run.records as Record<string, unknown>
  const pick = (k: string): OrgState | undefined => (rec[k] as { base?: OrgState } | undefined)?.base
  const clean = rec.limpieza as { donBetoDespues?: OrgState; platformAdmins?: number; verificado?: boolean; activacionesQueQuedan?: { action: string; reference: string | null; reason: string | null; created_at: string }[] } | undefined
  const acts = (clean?.activacionesQueQuedan ?? []).map((a) => `<tr><td>${esc(a.action)}</td><td>${esc(a.reference ?? '—')}</td><td>${esc(a.reason ?? '—')}</td><td>${esc(a.created_at)}</td></tr>`).join('')
  return `<section class="page"><p class="brand">Antes y después</p><h2>Plomería Don Beto y superadmin: registro de la base</h2>
    <p class="lead">Lecturas con SELECT de solo lectura sobre <code>organizations</code> y <code>platform_admins</code> en la base local.</p>
    <table class="grid"><thead><tr><th>Momento</th><th>plan</th><th>subscription_status</th><th>current_period_end</th><th>billing_provider</th><th>billing_reference</th></tr></thead><tbody>
      ${stateRow('Antes del recorrido', rec.donBetoAntes as OrgState)}
      ${stateRow('Tras suspender (UI)', pick('donBetoTrasSuspender'))}
      ${stateRow('Tras activar (UI)', pick('donBetoTrasActivar'))}
      ${stateRow('Después de restoreDonBeto()', clean?.donBetoDespues)}
    </tbody></table>
    <h3>platform_admins</h3>
    <table class="grid"><thead><tr><th>Antes</th><th>Tras grantPlatformAdmin</th><th>Después de revokePlatformAdmin</th></tr></thead>
      <tbody><tr><td>${esc(String(rec.platformAdminsAntes))}</td><td>${esc(String(rec.platformAdminsTrasDar))}</td><td>${esc(String(clean?.platformAdmins))}</td></tr></tbody></table>
    <p class="${clean?.verificado ? 'ok' : 'bad'}">Limpieza ${clean?.verificado ? 'verificada: Don Beto quedó en pro, active y con vencimiento, proveedor y referencia en NULL; platform_admins está vacía.' : 'con diferencias: revisar steps.json.'}</p>
    <h3>Filas de plan_activations que se dejan como evidencia</h3>
    <table class="grid"><thead><tr><th>action</th><th>reference</th><th>reason</th><th>created_at</th></tr></thead><tbody>${acts}</tbody></table>
    <p class="muted">restoreDonBeto() solo borra referencias MP-E2E-; estas filas MP-EVIDENCIA se conservan a propósito como historial.</p>
    <h3>Otros cambios que deja el recorrido en los datos demo</h3>
    <ul class="log">
      <li>Megaglass: en Configuración → Empresa quedaron la liga de pago (ficticia, https://mpago.la/megaglass-demo-anticipo) y las instrucciones de anticipo. El 50 % ya existía.</li>
      <li>Megaglass: la cotización ${esc(String((rec.cotizacion as { Folio?: string } | undefined)?.Folio ?? ''))} quedó Aceptada por «Ing. Rodrigo Salinas», con una liga activa nueva y un aviso «WhatsApp enviado» en su historial de envíos.</li>
    </ul></section>`
}

function verification(): string {
  const rows = VERIFICATION.map(([n, r, d]) => `<tr><td>${esc(n)}</td><td class="ok">${esc(r)}</td><td>${esc(d)}</td></tr>`).join('')
  return `<section class="page"><p class="brand">Verificación técnica</p><h2>Pruebas automáticas de D1 + D2</h2>
    <table class="grid"><thead><tr><th>Prueba</th><th>Resultado</th><th>Origen del dato</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="muted">SQL: «aprobadas / fallidas». Las suites SQL se corren con <code>psql "$DB" -v ON_ERROR_STOP=1 -f apps/web/supabase/tests/&lt;suite&gt;.sql</code> y revierten todo al terminar.</p>
  </section>`
}

function exceptions(): string {
  const rows = EXCEPTIONS.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')
  return `<section class="page"><p class="brand">Excepciones al recorrido solo-UI</p><h2>Lo que no se hizo con clics, y por qué</h2><dl class="summary">${rows}</dl></section>`
}

function observations(run: Run): string {
  const notes = run.notes.map((n) => `<li>${esc(n)}</li>`).join('')
  const obs = OBSERVATIONS.map(([t, d]) => `<dt>${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')
  return `<section class="page"><p class="brand">Observaciones</p><h2>Lo que se ve mal o se puede mejorar</h2>
    <dl class="summary">${obs}</dl>
    <h3>Notas del recorrido</h3><ul class="log">${notes}</ul></section>`
}

async function main(): Promise<void> {
  const run: Run = JSON.parse(readFileSync(path.join(OUT_DIR, 'steps.json'), 'utf8'))
  const steps = [...run.steps].sort((a, b) => a.n - b.n)
  const body = cover({ ...run, steps }) + summary() + steps.map(stepPage).join('') + beforeAfter(run) + verification() + exceptions() + observations(run)
  const out = path.join(OUT_DIR, 'evidencia-d1-d2.pdf')
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${CSS}${EXTRA_CSS}</style></head><body>${body}</body></html>`
  await printPdf(html, out, 'CotizaPro · Evidencia D1 + D2')
  process.stdout.write(`PDF: ${out}\n`)
}

void main()
