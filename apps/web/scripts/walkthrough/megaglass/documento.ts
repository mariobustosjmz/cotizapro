/**
 * Documento de presentación para MEGAGLASS (PDF): idea, accesos, caso ya cargado con evidencias, recorrido por
 * módulo, arranque al día siguiente, preguntas y respuestas, retos y cuestionario de feedback.
 * Las capturas salen de docs/handoff/megaglass/local/capturas (mismos datos que el seed de producción).
 *   pnpm exec tsx scripts/walkthrough/megaglass/documento.ts <prod|local> <baseUrl>
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import QRCode from 'qrcode'
import { esc, imageBlock, pdfFirstPage, printPdf } from '../render'
import { BEFORE_AFTER, CHALLENGES, DAY_ONE, FAQ, LIMITS, MOBILE_SHOTS, MODULES, NEEDED, OPEN_QUESTIONS, PRICE_QUESTIONS, PRICE_TABLE, RATINGS } from './contenido'
import { DOC_CSS } from './estilos'

interface SummaryQuote {
  readonly key: string
  readonly number: string
  readonly status: string
  readonly total: number
  readonly paid: number
  readonly story: string
}

interface Summary {
  readonly slug: string
  readonly usuarios: readonly { readonly email: string; readonly fullName: string; readonly role: string }[]
  readonly quotes: readonly SummaryQuote[]
}

const ROOT = path.resolve(__dirname, '../../../../../docs/handoff/megaglass')
const SHOTS = path.join(ROOT, 'local', 'capturas')
const PHOTOS = path.resolve(__dirname, '../../seed/presentacion/fotos')
const STATUS: Readonly<Record<string, string>> = { draft: 'Borrador', sent: 'Enviada', viewed: 'Vista', accepted: 'Aceptada', rejected: 'Rechazada', en_instalacion: 'En instalación', completado: 'Completada', cobrado: 'Cobrada' }
const ROLE: Readonly<Record<string, string>> = { owner: 'Dirección (acceso total)', admin: 'Ventas (catálogo, precios, página y equipo)', member: 'Instalación (cotizaciones, agenda y fotos)' }
const CLIENT: Readonly<Record<string, string>> = { elizondo: 'Familia Elizondo', andrea: 'Andrea Garza', salinas: 'Despacho Salinas Arquitectos', nogalera: 'Restaurante La Nogalera', cantu: 'Carlos Cantú', fuerza: 'Gimnasio Fuerza Regia', laura: 'Laura Méndez', contry: 'Clínica Dental Contry', trevino: 'Roberto Treviño', torres: 'Condominio Torres del Lago' }

const mxn = (n: number): string => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const shot = (name: string): string => (existsSync(path.join(SHOTS, `${name}.png`)) ? imageBlock(readFileSync(path.join(SHOTS, `${name}.png`))) : '')
const img = (file: string, cls = ''): string => `<img class="${cls}" src="data:image/png;base64,${readFileSync(file).toString('base64')}" />`

function cover(s: Summary, base: string, password: string, qr: string): string {
  const publicUrl = `${base}/p/${s.slug}`
  const users = s.usuarios.map((u) => `<tr><td>${esc(ROLE[u.role] ?? u.role)}</td><td><b>${esc(u.email)}</b></td></tr>`).join('')
  return `<section class="cover">
    <p class="brand">CotizaPro · Propuesta para MEGAGLASS</p>
    <h1>Cotizar, cobrar y crecer desde el celular</h1>
    <p class="lead">Este documento explica la idea, muestra un caso de seis semanas ya cargado en una cuenta de prueba de MEGAGLASS con sus evidencias, recorre cada módulo y propone cómo arrancar al día siguiente. Al final hay preguntas frecuentes, retos para explorar y un cuestionario para conocer su opinión.</p>
    <div class="access">
      <div><h3>Accesos a la cuenta de prueba</h3>
        <table class="kv"><tr><th>Entrar</th><td><a href="${esc(base)}/login">${esc(base)}/login</a></td></tr><tr><th>Contraseña</th><td><code class="pw">${esc(password)}</code> (la misma para los tres usuarios)</td></tr></table>
        <table class="grid">${users}</table>
        <p class="muted">Pueden cambiar, crear o borrar lo que quieran: es una cuenta de práctica y no se reinicia sola.</p></div>
      <div class="qr"><img src="${qr}" /><p><b>Página pública</b><br><a href="${esc(publicUrl)}">${esc(publicUrl.replace(/^https?:\/\//, ''))}</a></p></div>
    </div>
    <h3>Contenido</h3>
    <ol class="toc"><li>La idea</li><li>Lo que ya está hecho: el caso de MEGAGLASS</li><li>Recorrido por módulo</li><li>En el celular</li><li>Cómo arrancar al día siguiente</li><li>Preguntas y respuestas</li><li>Explórenlo: retos</li><li>Su opinión: cuestionario</li></ol>
  </section>`
}

function idea(): string {
  const rows = BEFORE_AFTER.map(([what, today, tomorrow]) => `<tr><th>${esc(what)}</th><td>${esc(today)}</td><td>${esc(tomorrow)}</td></tr>`).join('')
  return `<section class="page"><p class="brand">1 · La idea</p><h2>Un solo lugar para todo el trabajo, desde la solicitud hasta el cobro</h2>
    <p class="lead">CotizaPro es una plataforma web pensada para talleres de vidrio, aluminio y cancelería. Se abre en la computadora del mostrador o en el celular del vendedor en la obra, y todo el equipo ve la misma información.</p>
    <table class="compare"><thead><tr><th></th><th>Hoy</th><th>Con CotizaPro</th></tr></thead><tbody>${rows}</tbody></table>
    <h3>El ciclo de un trabajo</h3>
    <div class="flow">${['Solicitud desde la página o WhatsApp', 'Medición agendada', 'Cotización por medidas y PDF', 'Aceptación y anticipo', 'Instalación con fotos', 'Liquidación', 'Reseña verificada'].map((t, i) => `<span><b>${i + 1}</b>${esc(t)}</span>`).join('')}</div>
  </section>`
}

function caseSection(s: Summary): string {
  const rows = s.quotes.map((q) => `<tr><td class="nw">${esc(q.number)}</td><td>${esc(CLIENT[q.key] ?? q.key)}</td><td><span class="st st-${esc(q.status)}">${esc(STATUS[q.status] ?? q.status)}</span></td><td class="r">${mxn(q.total)}</td><td class="r">${mxn(q.paid)}</td><td>${esc(q.story)}</td></tr>`).join('')
  const live = s.quotes.filter((q) => !['rejected', 'draft', 'sent', 'viewed'].includes(q.status))
  const won = live.reduce((a, q) => a + q.total, 0)
  const paid = s.quotes.reduce((a, q) => a + q.paid, 0)
  const pending = live.reduce((a, q) => a + Math.max(0, q.total - q.paid), 0)
  const pdf = pdfFirstPage(path.join(SHOTS, 'cotizacion-andrea.pdf'))
  const photo = (f: string, cap: string): string => `<figure>${img(path.join(PHOTOS, f))}<figcaption>${esc(cap)}</figcaption></figure>`
  return `<section class="page"><p class="brand">2 · Lo que ya está hecho</p><h2>Seis semanas de MEGAGLASS, ya cargadas</h2>
    <p class="lead">La cuenta de prueba tiene un caso completo con clientes y trabajos ficticios de Monterrey. Cada cotización representa una situación real del taller; las fechas se ajustan solas al día en que se cargó la cuenta.</p>
    <div class="kpis"><div><b>${s.quotes.length}</b>cotizaciones</div><div><b>${mxn(won)}</b>en trabajos ganados</div><div><b>${mxn(paid)}</b>cobrado</div><div><b>${mxn(pending)}</b>por cobrar</div></div>
    <table class="index"><thead><tr><th>Folio</th><th>Cliente</th><th>Estado</th><th class="r">Total</th><th class="r">Cobrado</th><th>Qué muestra</th></tr></thead><tbody>${rows}</tbody></table>
  </section>
  <section class="page"><p class="brand">2 · Evidencias</p><h2>Fotos, PDF y reseñas que genera el propio trabajo</h2>
    <p class="lead">Las fotos de antes y después se suben desde cada cotización y, si se marcan "En mi página", forman el portafolio público. En este caso son ilustraciones; en su cuenta serán fotos de sus trabajos.</p>
    <div class="photos">${photo('bano-antes.png', 'Andrea Garza · antes')}${photo('bano-despues.png', 'Andrea Garza · después')}${photo('restaurante-antes.png', 'La Nogalera · antes')}${photo('restaurante-despues.png', 'La Nogalera · después')}${photo('oficina-obra.png', 'Despacho Salinas · en obra')}${photo('cantu-despues.png', 'Carlos Cantú · terminado')}</div>
    <h3>Reseñas verificadas</h3><div class="reviews">
        <blockquote><b>★★★★★ Andrea G.</b><br>"Desde que pedí la cotización en su página todo fue claro: me mandaron el PDF el mismo día, llegaron puntuales y el cancel quedó perfecto."<br><i>Respuesta de MEGAGLASS: ¡Gracias, Andrea! Fue un gusto trabajar en su casa.</i></blockquote>
        <blockquote><b>★★★★★ Rosa E.</b><br>"Les llamamos en la mañana y a mediodía ya estaba el vidrio nuevo. Muy recomendables."</blockquote>
        <blockquote><b>★★★★☆ Familia E.</b><br>"Buen trabajo y bien terminado. Tardaron un día más de lo prometido, pero avisaron con tiempo."</blockquote>
        </div><p class="muted">Una reseña de 4 estrellas con respuesta del taller da más confianza que solo cincos.</p>
  </section>
  ${pdf ? `<section class="page"><p class="brand">2 · Evidencias</p><h2>El PDF que recibe el cliente</h2><p class="lead">Cotización de Andrea Garza tal como la descarga el botón "PDF": datos de MEGAGLASS, partidas con medidas, IVA, total y términos.</p><div class="pdf">${imageBlock(pdf)}</div></section>` : ''}`
}

function modules(): string {
  return MODULES.map((m, i) => {
    const [first, ...rest] = m.shots
    const extra = rest.map((name) => `<section class="page module"><p class="brand">3.${i + 1} · ${esc(m.title)} (continuación)</p>${shot(name)}</section>`).join('')
    return `<section class="page module"><p class="brand">3.${i + 1} · Recorrido por módulo</p><h2>${esc(m.title)}</h2>
    <table class="kv"><tr><th>Para qué sirve</th><td>${esc(m.purpose)}</td></tr><tr><th>En la cuenta de prueba</th><td>${esc(m.inAccount)}</td></tr><tr><th>Pruébenlo</th><td>${m.tryIt.map(esc).join('<br>')}</td></tr></table>
    ${first ? shot(first) : ''}</section>${extra}`
  }).join('')
}

function mobile(): string {
  const cells = MOBILE_SHOTS.filter(([f]) => existsSync(path.join(SHOTS, `${f}.png`))).map(([f, cap]) => `<figure>${img(path.join(SHOTS, `${f}.png`), 'phone')}<figcaption>${esc(cap)}</figcaption></figure>`).join('')
  return `<section class="page"><p class="brand">4 · En el celular</p><h2>Lo mismo, en el bolsillo del vendedor y del instalador</h2>
    <p class="lead">Todos los módulos se revisaron en celular (390 px) y tableta. Desde el teléfono se cotiza por medidas, se registran pagos, se suben fotos de la obra y se consulta la agenda.</p>
    <div class="phones">${cells}</div>
    </section><section class="page"><p class="brand">4 · En el celular</p><h2>Su página pública en el celular del cliente</h2><p class="lead">Lo que ve cualquier persona al abrir la liga o escanear el QR: sin cuenta, sin instalar nada.</p><div class="phones solo">${existsSync(path.join(SHOTS, 'pagina-publica-celular.png')) ? `<figure>${img(path.join(SHOTS, 'pagina-publica-celular.png'), 'phone tall')}<figcaption>Lo que ve un cliente al abrir la liga o el QR</figcaption></figure>` : ''}</div></section>`
}

function startNextDay(): string {
  const rows = DAY_ONE.map((d) => `<tr><th>${esc(d.when)}</th><td>${esc(d.what)}</td><td>${esc(d.who)}</td></tr>`).join('')
  return `<section class="page"><p class="brand">5 · Cómo arrancar al día siguiente</p><h2>Plan de arranque: un día para estar operando</h2>
    <p class="lead">Su cuenta definitiva se crea limpia, con el catálogo de vidrio y aluminio ya cargado y sus precios. La cuenta de prueba puede quedarse para que el equipo practique sin miedo.</p>
    <table class="index"><thead><tr><th>Cuándo</th><th>Qué</th><th>Quién</th></tr></thead><tbody>${rows}</tbody></table>
    <h3>Lo que necesitamos de MEGAGLASS</h3><ul class="check">${NEEDED.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    <h3>Lo que todavía no hace</h3><ul>${LIMITS.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></section>`
}

function faq(): string {
  return `<section class="page"><p class="brand">6 · Preguntas y respuestas</p><h2>Lo que más se pregunta</h2>
    <dl class="faq">${FAQ.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join('')}</dl></section>`
}

function feedback(): string {
  const scale = RATINGS.map((r) => `<tr><td>${esc(r)}</td>${[1, 2, 3, 4, 5].map(() => '<td class="box">☐</td>').join('')}</tr>`).join('')
  return `<section class="page"><p class="brand">7 · Explórenlo</p><h2>Diez retos para conocer el sistema en una hora</h2>
    <ol class="check">${CHALLENGES.map((c) => `<li>☐ ${esc(c)}</li>`).join('')}</ol>
    <p class="muted">Si algo no funciona como esperaban, anótenlo: eso es justo lo que más nos sirve.</p></section>
  <section class="page"><p class="brand">8 · Su opinión</p><h2>Cuestionario de retroalimentación</h2>
    <p class="lead">Califiquen del 1 (nada útil) al 5 (muy útil) y contesten las preguntas abiertas. Pueden responder en este documento o mandar las respuestas a Mario Bustos por WhatsApp o correo.</p>
    <table class="index rating"><thead><tr><th>Aspecto</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th></tr></thead><tbody>${scale}</tbody></table>
    ${OPEN_QUESTIONS.map((q) => `<p class="q">${esc(q)}</p><div class="lines"></div>`).join('')}
    <p class="muted">Nombre y puesto de quien responde: ______________________________</p></section>
  <section class="page"><p class="brand">8 · Su opinión (continuación)</p><h2>Sobre el precio</h2>
    <p class="lead">Estos son los precios que proponemos (mensuales, IVA incluido). Su respuesta honesta nos ayuda a ajustarlos antes de activar el cobro.</p>
    <table class="index"><thead><tr><th>Plan</th><th>Precio al mes</th><th>Usuarios</th></tr></thead><tbody>${PRICE_TABLE.map(([n, p, u]) => `<tr><td>${esc(n)}</td><td class="nw">${esc(p)}</td><td>${esc(u)}</td></tr>`).join('')}</tbody></table>
    ${PRICE_QUESTIONS.map((q) => `<p class="q">${esc(q)}</p><div class="lines"></div>`).join('')}</section>`
}

async function main(): Promise<void> {
  const env = process.argv[2] ?? 'local'
  const base = (process.argv[3] ?? 'http://localhost:3100').replace(/\/$/, '')
  const dir = path.join(ROOT, env)
  const summary: Summary = JSON.parse(readFileSync(path.join(dir, 'resumen.json'), 'utf8'))
  const password = readFileSync(path.join(dir, 'credenciales.txt'), 'utf8').match(/Contraseña[^:]*:\s*(\S+)/)?.[1] ?? '(ver credenciales.txt)'
  const qr = await QRCode.toDataURL(`${base}/p/${summary.slug}`, { margin: 1, width: 360 })
  const body = cover(summary, base, password, qr) + idea() + caseSection(summary) + modules() + mobile() + startNextDay() + faq() + feedback()
  const out = path.join(dir, 'MEGAGLASS-CotizaPro-presentacion.pdf')
  await printPdf(`<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${DOC_CSS}</style></head><body>${body}</body></html>`, out, 'CotizaPro · MEGAGLASS · documento confidencial: contiene accesos')
  process.stdout.write(`PDF: ${out}\n`)
}

void main()
