/**
 * Genera el PDF del recorrido a partir de docs/handoff/recorrido-<env>/steps.json y sus capturas.
 *   pnpm exec tsx scripts/walkthrough/report.ts [prod|local]
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { esc, htmlDoc, pdfFirstPage, printPdf, route, stepSection } from './render'
interface Step {
  readonly n: number
  readonly id: string
  readonly title: string
  readonly image: string
  readonly url: string
  readonly at: string
  readonly facts: Readonly<Record<string, string>>
}
interface Run {
  readonly base: string
  readonly env: string
  readonly business: string
  readonly email: string
  readonly slug: string
  readonly quoteId: string
  readonly finishedAt: string
  readonly steps: readonly Step[]
}
interface StepInfo {
  readonly area: string
  readonly what: string
  readonly apis: readonly string[]
}

const INFO: Readonly<Record<string, StepInfo>> = {
  registro: { area: 'Acceso', what: 'Alta de una persona o negocio nuevo. Crea el usuario, la organización y su perfil de dueño.', apis: ['Supabase Auth: POST /auth/v1/signup', 'RPC create_organization_with_owner'] },
  'dashboard-vacio': { area: 'Panel del taller', what: 'Primer ingreso. El aviso naranja invita a configurar la cuenta; solo lo ve el dueño mientras no termine la configuración.', apis: [] },
  'configurar-cuenta': { area: 'Panel del taller · Configuración', what: 'Elige cómo trabaja (persona, equipo o empresa) y su giro. Al guardar se cargan listas de precios y productos de la plantilla y se crea su página pública en borrador.', apis: ['POST /api/organization/setup'] },
  'listas-precios': { area: 'Panel del taller · Motor de precios', what: 'Tablas de precios por medida y material que usa el motor. Se editan aquí; las cotizaciones ya guardadas no cambian.', apis: ['GET /api/price-lists', 'PATCH /api/price-lists/[id]'] },
  servicios: { area: 'Panel del taller · Catálogo', what: 'Productos de la plantilla. Los marcados "Configurable" se cotizan por medidas; "Probar" abre la calculadora.', apis: ['GET /api/services', 'POST /api/pricing/preview'] },
  'mi-pagina': { area: 'Panel del taller · Vitrina', what: 'Edición y publicación de la página pública, liga para compartir, código QR y tarjeta QR en PDF.', apis: ['PUT /api/showcase/profile', 'GET /api/showcase/qr-card'] },
  'vitrina-nueva-movil': { area: 'Página pública (sin sesión)', what: 'Lo que ve un cliente al abrir la liga o escanear el QR. Aún sin trabajos ni reseñas.', apis: ['RPC get_public_profile'] },
  'cliente-solicita': { area: 'Página pública (sin sesión)', what: 'El cliente pide cotización con nombre, teléfono, necesidad y medidas aproximadas.', apis: ['POST /api/public/quote-requests'] },
  'solicitud-enviada': { area: 'Página pública (sin sesión)', what: 'Confirmación al cliente. La solicitud queda registrada con límite por IP y antispam.', apis: [] },
  'bandeja-solicitudes': { area: 'Panel del taller · Solicitudes', what: 'La solicitud llega a la bandeja. Desde aquí se contacta por WhatsApp, se descarta o se convierte en cliente y cotización.', apis: ['GET /api/quote-requests', 'POST /api/quote-requests/[id]/convert'] },
  'partida-cancel': { area: 'Panel del taller · Nueva cotización', what: 'Partida configurable: se capturan medidas y opciones; el motor calcula material, procesos, herrajes, desperdicio e instalación.', apis: ['GET /api/price-lists', 'Motor @cotizapro/quoting en el navegador (vista previa)'] },
  'cotizacion-armada': { area: 'Panel del taller · Nueva cotización', what: 'Cotización con varias partidas. Al guardar, el servidor recalcula cada precio e ignora lo que mande el navegador.', apis: ['POST /api/quotes'] },
  'detalle-cotizacion': { area: 'Panel del taller · Cotización', what: 'Cotización guardada con su copia congelada de precios, estado, pagos, fotos y agenda.', apis: ['GET /api/quotes/[id]', 'GET /api/export/quote/[id] (PDF)'] },
  'dialogo-envio': { area: 'Panel del taller · Cotización', what: 'Envío al cliente por correo o WhatsApp. En producción falta la llave de correo y el WhatsApp actual usa Twilio (pendiente pasar a wa.me).', apis: ['POST /api/quotes/[id]/send'] },
  'trabajo-cobrado': { area: 'Panel del taller · Cotización', what: 'Ciclo completo: enviada → aceptada → en instalación → completada → cobrada, con anticipo y liquidación, y fotos antes/después publicadas.', apis: ['PATCH /api/quotes/[id] (estado)', 'POST /api/quotes/[id]/payments', 'POST /api/upload/job-photos', 'PATCH /api/job-photos/[id]'] },
  'pedir-resena': { area: 'Panel del taller · Cotización', what: 'Al estar cobrada se genera una liga de reseña de un solo uso para WhatsApp, correo o copiar.', apis: ['POST /api/quotes/[id]/review-request'] },
  'cliente-califica': { area: 'Liga de reseña (sin sesión)', what: 'El cliente abre la liga en su celular y califica de 1 a 5 con comentario.', apis: ['RPC get_review_request'] },
  'resena-enviada': { area: 'Liga de reseña (sin sesión)', what: 'Reseña registrada. La liga deja de funcionar.', apis: ['POST /api/public/reviews'] },
  'vitrina-final': { area: 'Página pública (sin sesión)', what: 'La página ahora muestra trabajos realizados, calificación, portafolio y la reseña verificada.', apis: ['RPC get_public_profile'] },
  'dashboard-final': { area: 'Panel del taller', what: 'Tablero con la actividad del recorrido: cliente, cotización y cobro.', apis: [] },
}

function stepPage(dir: string, s: Step): string {
  const info = INFO[s.id] ?? { area: '', what: '', apis: [] }
  return stepSection(dir, { ...s, ...info })
}

function indexTable(steps: readonly Step[]): string {
  const rows = steps
    .map((s) => {
      const r = route(s.url)
      return `<tr><td>${s.n}</td><td>${esc(INFO[s.id]?.area ?? '')}</td><td>${esc(s.title)}</td><td><code>${esc(r.pattern)}</code></td></tr>`
    })
    .join('')
  return `<table class="index"><thead><tr><th>#</th><th>Parte del sistema</th><th>Paso</th><th>Ruta</th></tr></thead><tbody>${rows}</tbody></table>`
}

async function main(): Promise<void> {
  const env = process.argv[2] ?? 'prod'
  const dir = path.resolve(__dirname, `../../../../docs/handoff/recorrido-${env}`)
  const run: Run = JSON.parse(readFileSync(path.join(dir, 'steps.json'), 'utf8'))
  const steps = run.steps.filter((s) => existsSync(path.join(dir, s.image)))
  const host = new URL(run.base).host
  const cover = `<section class="cover">
    <p class="brand">CotizaPro · Recorrido real</p>
    <h1>Un taller nuevo, de cero a su primera reseña verificada</h1>
    <p class="lead">Recorrido automatizado de punta a punta contra <b>${esc(host)}</b>. Un negocio de vidrio y aluminio se registra, configura su giro, publica su página, recibe una solicitud de un cliente, cotiza por medidas, cobra, documenta el trabajo con fotos y obtiene una reseña verificada. Cada página muestra la URL exacta, la ruta de la aplicación, el archivo de código y los endpoints que intervienen.</p>
    <table class="cover-meta">
      <tr><th>Entorno</th><td>${esc(run.base)} (${env === 'prod' ? 'producción' : 'local'})</td></tr>
      <tr><th>API</th><td>${env === 'prod' ? 'https://api.cotizapro.mariobustos.io' : 'Supabase local'}</td></tr>
      <tr><th>Negocio</th><td>${esc(run.business)} · página <a href="${esc(run.base)}/p/${esc(run.slug)}">/p/${esc(run.slug)}</a></td></tr>
      <tr><th>Fecha</th><td>${esc(new Date(run.finishedAt).toLocaleString('es-MX', { timeZone: 'America/Monterrey' }))}</td></tr>
      <tr><th>Pasos</th><td>${steps.length}</td></tr>
    </table>
    <p class="legend"><b>Partes del sistema:</b> <i>Panel del taller</i> = rutas <code>/dashboard/*</code> con sesión del dueño. <i>Página pública</i> = <code>/p/[slug]</code>, sin sesión, lo que ve cualquier cliente. <i>Liga de reseña</i> = <code>/r/[token]</code>, sin sesión, de un solo uso. Los datos viven en Supabase propio (<code>/auth/v1</code>, <code>/rest/v1</code>, <code>/storage/v1</code>).</p>
    ${indexTable(steps)}
  </section>`
  const pdfImg = pdfFirstPage(path.join(dir, 'cotizacion.pdf'))
  const pdfPage = pdfImg
    ? `<section class="step"><div class="head"><span class="num">PDF</span><div><p class="area">Lo que recibe el cliente</p><h2>PDF de la cotización</h2></div></div>
        <table class="meta"><tr><th>URL</th><td>${esc(run.base)}/api/export/quote/${esc(run.quoteId)}</td></tr><tr><th>Ruta</th><td><code>GET /api/export/quote/[id]</code></td></tr><tr><th>Código</th><td><code>apps/web/lib/pdf/QuotePDF.tsx</code> · <code>apps/web/lib/pdf/quote-materials.ts</code></td></tr></table>
        <p class="what">Documento que se descarga o se envía al cliente: partidas con medidas, totales con IVA y lista de materiales calculada desde el desglose de cada partida configurable.</p>
        <div class="shot"><img src="data:image/png;base64,${pdfImg.toString('base64')}" /></div></section>`
    : ''
  const pages = steps.map((s) => stepPage(dir, s) + (s.id === 'detalle-cotizacion' ? pdfPage : '')).join('')
  const out = path.join(dir, `recorrido-cotizapro-${env}.pdf`)
  await printPdf(htmlDoc(`${cover}${pages}`), out, `CotizaPro · recorrido ${env}`)
  process.stdout.write(`PDF: ${out}\n`)
}

void main()
