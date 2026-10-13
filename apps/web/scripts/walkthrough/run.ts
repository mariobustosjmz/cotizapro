/**
 * Recorrido real desde cero en el entorno local (mismo código que producción):
 * un taller de vidrio nuevo se registra, configura, publica, recibe una solicitud, cotiza con medidas,
 * cobra, sube fotos y obtiene una reseña verificada. Cada paso deja captura y datos en docs/handoff/recorrido.
 *
 *   pnpm exec tsx scripts/walkthrough/run.ts [baseURL]
 *
 * Credencial de la cuenta de prueba (solo local): WALKTHROUGH_PASSWORD o el valor por defecto de abajo.
 */
import { randomBytes } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { chooseComboboxOption } from '../../e2e/helpers/combobox'
import { drawPhoto } from './photos'

const BASE = (process.argv[2] ?? 'https://cotizapro.mariobustos.io').replace(/\/$/, '')
const ENV_NAME = /localhost|127\.0\.0\.1/.test(BASE) ? 'local' : 'prod'
const OUT = path.resolve(__dirname, `../../../../docs/handoff/recorrido-${ENV_NAME}`)
const PASSWORD = process.env.WALKTHROUGH_PASSWORD ?? `Rc-${randomBytes(9).toString('base64url')}`
const STAMP = Date.now().toString().slice(-6)
const BUSINESS = `Vidrios Sierra Madre ${STAMP}`
const EMAIL = `taller.sierra.${STAMP}@e2e.cotizapro.mx`
const CLIENT = { name: 'Andrea Villarreal', phone: '81 2345 6789', message: 'Necesito un cancel de baño templado para regadera y un espejo para el lavabo. ¿Pueden venir a medir?', measures: 'Regadera 1.50 x 1.90 m; espejo 0.90 x 0.70 m' }

interface Step {
  readonly n: number
  readonly id: string
  readonly title: string
  readonly image: string
  readonly url: string
  readonly at: string
  readonly facts: Readonly<Record<string, string>>
}
const steps: Step[] = []

async function shot(page: Page, id: string, title: string, facts: Record<string, string> = {}, fullPage = false): Promise<void> {
  const n = steps.length + 1
  const image = `${String(n).padStart(2, '0')}-${id}.png`
  await page.waitForLoadState('networkidle').catch(() => undefined)
  await page.screenshot({ path: path.join(OUT, image), fullPage })
  steps.push({ n, id, title, image, url: page.url(), at: new Date().toISOString(), facts })
  process.stdout.write(`  [${n}] ${title}\n`)
}

async function signupAndSetup(page: Page): Promise<void> {
  await page.goto(`${BASE}/signup`)
  await page.locator('input[name="fullName"]').fill('Ramiro Garza')
  await page.locator('input[name="email"]').fill(EMAIL)
  await page.locator('input[name="orgName"]').fill(BUSINESS)
  await page.locator('input[name="password"]').fill(PASSWORD)
  await shot(page, 'registro', 'Registro de la cuenta nueva', { negocio: BUSINESS, correo: EMAIL })
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  await page.goto(`${BASE}/dashboard`)
  await shot(page, 'dashboard-vacio', 'Primer ingreso: tablero vacío con aviso "Configura tu cuenta"')
  await page.getByTestId('setup-banner').click()
  await page.getByTestId('account-type-company').click()
  await page.getByTestId('trade-glass').click()
  await shot(page, 'configurar-cuenta', 'Configuración: "Como empresa" y giro "Vidrio y aluminio"', {}, true)
  await page.getByTestId('account-setup-submit').click()
  await page.waitForURL(/\/dashboard\/vitrina/, { timeout: 30000 })
}

async function reviewCatalog(page: Page): Promise<void> {
  await page.goto(`${BASE}/dashboard/price-lists`)
  await shot(page, 'listas-precios', 'Listas de precios cargadas por la plantilla de vidrio (editables)')
  await page.goto(`${BASE}/dashboard/services`)
  await shot(page, 'servicios', 'Catálogo de productos configurables de la plantilla')
}

async function publishShowcase(page: Page): Promise<string> {
  await page.goto(`${BASE}/dashboard/vitrina`)
  await page.locator('#vitrina-headline').fill('Canceles de baño, ventanas de aluminio y espejos a la medida')
  await page.locator('#vitrina-bio').fill('Taller familiar con 12 años en Monterrey. Medimos sin costo, fabricamos en 5 días e instalamos con garantía de 6 meses.')
  await page.locator('#vitrina-city').fill('Monterrey, N.L.')
  await page.locator('#vitrina-service_area').fill('Monterrey, San Pedro y Santa Catarina')
  await page.locator('#vitrina-whatsapp_phone').fill('81 1234 5678')
  await page.getByTestId('vitrina-is_published').check()
  await page.getByTestId('vitrina-save').click()
  await page.getByText('Cambios guardados').waitFor()
  const url = (await page.getByTestId('vitrina-url').textContent())!.trim()
  await shot(page, 'mi-pagina', 'Mi página pública: datos, publicación, liga y código QR', { liga: url }, true)
  return url.split('/p/')[1]!
}

async function clientRequest(browser: Browser, slug: string): Promise<void> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/p/${slug}`)
  await shot(page, 'vitrina-nueva-movil', 'Lo que ve el cliente en su celular: página nueva, aún sin trabajos ni reseñas')
  await page.locator('#qr-name').fill(CLIENT.name)
  await page.locator('#qr-phone').fill(CLIENT.phone)
  await page.locator('#qr-message').fill(CLIENT.message)
  await page.locator('#qr-measurements').fill(CLIENT.measures)
  await page.locator('#pedir-cotizacion').scrollIntoViewIfNeeded()
  await shot(page, 'cliente-solicita', 'El cliente llena "Pedir cotización" desde la página', { cliente: CLIENT.name })
  await page.getByRole('button', { name: 'Enviar solicitud' }).click()
  await page.getByTestId('quote-request-sent').waitFor()
  await shot(page, 'solicitud-enviada', 'Confirmación al cliente')
  await ctx.close()
}

async function addConfigurable(page: Page, index: number, search: string, choose: (prefix: string) => Promise<void>): Promise<void> {
  if (index > 0) await page.getByRole('button', { name: 'Agregar item' }).click()
  await page.getByRole('button', { name: 'Libre' }).first().click()
  await page.keyboard.type(search)
  await page.locator('button', { hasText: search }).first().dispatchEvent('mousedown')
  await page.getByTestId(`item-${index}-panel`).waitFor()
  await choose(`item-${index}`)
}

async function quoteFromRequest(page: Page): Promise<string> {
  await page.goto(`${BASE}/dashboard/solicitudes`)
  await page.getByTestId('quote-request-card').first().waitFor()
  await shot(page, 'bandeja-solicitudes', 'La solicitud llega a la bandeja del taller')
  await page.getByRole('button', { name: 'Convertir en cotización' }).first().click()
  await page.waitForURL(/\/dashboard\/quotes\/new\?client_id=/, { timeout: 30000 })
  await addConfigurable(page, 0, 'Cancel de baño', async (p) => {
    await page.locator(`#${p}-ancho`).fill('1500')
    await page.locator(`#${p}-alto`).fill('1900')
    await chooseComboboxOption(page, `${p}-espesor`, '9')
    await chooseComboboxOption(page, `${p}-herraje`, 'Corredizo acero')
  })
  await shot(page, 'partida-cancel', 'Partida configurable: cancel 1.50 × 1.90 m, templado 9 mm, herraje de acero', {}, true)
  await addConfigurable(page, 1, 'Espejo a la medida', async (p) => {
    await page.locator(`#${p}-ancho`).fill('900')
    await page.locator(`#${p}-alto`).fill('700')
  })
  const total = (await page.getByRole('button', { name: /Crear Cotizaci/ }).last().textContent()) ?? ''
  await shot(page, 'cotizacion-armada', 'Cotización con dos partidas calculadas por el motor', { total: total.replace(/.*\(/, '').replace(')', '') }, true)
  await page.getByRole('button', { name: /Crear Cotizaci/ }).first().click()
  await page.waitForURL(/\/dashboard\/quotes(\?|$)/, { timeout: 30000 })
  await page.getByRole('link', { name: 'Ver' }).first().click()
  await page.waitForURL(/\/dashboard\/quotes\/[0-9a-f-]{36}$/)
  return page.url().split('/').pop()!
}

async function documentQuote(page: Page, quoteId: string): Promise<void> {
  await page.getByRole('heading', { name: /COT-\d/ }).waitFor({ timeout: 30000 })
  await shot(page, 'detalle-cotizacion', 'Detalle de la cotización guardada', {}, true)
  const pdf = await page.request.get(`${BASE}/api/export/quote/${quoteId}`)
  writeFileSync(path.join(OUT, 'cotizacion.pdf'), await pdf.body())
  await page.getByRole('button', { name: 'Enviar' }).first().click()
  await page.getByText('Enviar Cotización').waitFor()
  await shot(page, 'dialogo-envio', 'Diálogo de envío (correo / WhatsApp)')
  await page.keyboard.press('Escape')
  await page.goto(page.url())
}

async function advance(page: Page, quoteId: string, label: RegExp): Promise<void> {
  await page.getByRole('button', { name: label }).first().click()
  await page.waitForTimeout(1200)
  await page.goto(`${BASE}/dashboard/quotes/${quoteId}`)
}

async function payment(page: Page, amount: string, type: 'anticipo' | 'liquidacion'): Promise<void> {
  await page.getByRole('button', { name: 'Registrar Pago' }).first().click()
  await page.locator('#amount').fill(amount)
  await page.locator('#payment_type').selectOption(type)
  await page.locator('#payment_method').selectOption('transferencia')
  await page.locator('form button[type="submit"]').last().click()
  await page.waitForTimeout(1500)
}

async function executeJob(page: Page, browser: Browser, quoteId: string): Promise<string> {
  const res = await page.request.patch(`${BASE}/api/quotes/${quoteId}`, { data: { status: 'sent' } })
  if (!res.ok()) throw new Error(`No se pudo marcar enviada: ${res.status()}`)
  await page.goto(`${BASE}/dashboard/quotes/${quoteId}`)
  await advance(page, quoteId, /Aceptar|Aceptada/)
  const detail: { data: { total: number } } = await (await page.request.get(`${BASE}/api/quotes/${quoteId}`)).json()
  const total = Number(detail.data.total)
  const half = (Math.round(total * 50) / 100).toFixed(2)
  await payment(page, half, 'anticipo')
  await advance(page, quoteId, /Instalaci/)
  const input = page.getByTestId('job-photos-input')
  await page.getByRole('radio', { name: 'Antes' }).click()
  await input.setInputFiles({ name: 'antes.png', mimeType: 'image/png', buffer: await drawPhoto(browser, 'Antes: regadera sin cancel', 'before') })
  await page.getByTestId('job-photo').first().waitFor()
  await advance(page, quoteId, /Complet/)
  await page.getByRole('radio', { name: 'Después' }).click()
  await input.setInputFiles({ name: 'despues.png', mimeType: 'image/png', buffer: await drawPhoto(browser, 'Después: cancel templado 9 mm', 'after') })
  await page.getByTestId('job-photo').nth(1).waitFor()
  const checked = () => page.locator('[data-testid="job-photo"] input[type="checkbox"]:checked').count()
  for (let target = 1; target <= 2; target++) {
    await page.locator('[data-testid="job-photo"] input[type="checkbox"]:not(:checked):not([disabled])').first().click()
    await page.waitForFunction((n) => document.querySelectorAll('[data-testid="job-photo"] input[type="checkbox"]:checked').length >= n, target)
  }
  if ((await checked()) !== 2) throw new Error('No se publicaron las dos fotos')
  await payment(page, (total - Number(half)).toFixed(2), 'liquidacion')
  await advance(page, quoteId, /Cobrad/)
  await page.getByTestId('job-photos-section').scrollIntoViewIfNeeded()
  await shot(page, 'trabajo-cobrado', 'Trabajo cobrado: pagos al 100 %, fotos antes y después publicadas', { total: `$${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` }, true)
  const reviewRes = page.waitForResponse((r) => r.url().includes('/review-request') && r.request().method() === 'POST')
  await page.getByTestId('review-request-button').click()
  const body: { data: { url: string } } = await (await reviewRes).json()
  await page.getByTestId('review-request-card').scrollIntoViewIfNeeded()
  await shot(page, 'pedir-resena', 'Liga de reseña de un solo uso lista para WhatsApp o correo')
  return new URL(body.data.url).pathname
}

async function clientReview(browser: Browser, reviewPath: string, slug: string): Promise<BrowserContext> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true })
  const page = await ctx.newPage()
  await page.goto(`${BASE}${reviewPath}`)
  await page.getByRole('radio', { name: '5 estrellas', exact: true }).click()
  await page.locator('textarea').fill('Midieron el mismo día y el cancel quedó perfecto. Muy limpios en la instalación.')
  await shot(page, 'cliente-califica', 'El cliente califica desde su celular con la liga recibida')
  await page.getByRole('button', { name: /Enviar/ }).click()
  await page.getByText(/Gracias/).waitFor()
  await shot(page, 'resena-enviada', 'Reseña registrada')
  await page.goto(`${BASE}/p/${slug}`)
  await shot(page, 'vitrina-final', 'Página pública final: trabajo realizado, calificación, portafolio y reseña verificada', {}, true)
  return ctx
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true })
  writeFileSync(path.join(OUT, 'credenciales.txt'), `${BASE}/login\n${EMAIL}\n${PASSWORD}\n`, { mode: 0o600 })
  process.stdout.write(`Recorrido contra ${BASE} · salida ${OUT}\n`)
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } })
  const page = await ctx.newPage()
  try {
    await signupAndSetup(page)
    await reviewCatalog(page)
    const slug = await publishShowcase(page)
    await clientRequest(browser, slug)
    const quoteId = await quoteFromRequest(page)
    await documentQuote(page, quoteId)
    const reviewPath = await executeJob(page, browser, quoteId)
    const reviewCtx = await clientReview(browser, reviewPath, slug)
    await reviewCtx.close()
    await page.goto(`${BASE}/dashboard`)
    await shot(page, 'dashboard-final', 'Tablero del taller al cierre del recorrido')
    writeFileSync(path.join(OUT, 'steps.json'), JSON.stringify({ base: BASE, env: ENV_NAME, business: BUSINESS, email: EMAIL, slug, quoteId, finishedAt: new Date().toISOString(), steps }, null, 2))
  } catch (error) {
    await page.screenshot({ path: path.join(OUT, 'zz-error.png'), fullPage: true })
    writeFileSync(path.join(OUT, 'steps.json'), JSON.stringify({ base: BASE, business: BUSINESS, steps, error: String(error) }, null, 2))
    throw error
  } finally {
    await browser.close()
  }
}

void main()
