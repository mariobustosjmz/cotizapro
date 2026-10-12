/**
 * Pasada funcional en celular (390 px, táctil): las acciones clave del panel hechas desde la UI.
 * Solo local (crea datos de prueba en la org con la que se inicia sesión).
 *   AUDIT_EMAIL=… AUDIT_PASSWORD=… pnpm exec tsx scripts/walkthrough/movil/interaccion.ts [base] [outDir]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Page } from '@playwright/test'
import { Pacer, Recorder, todayIso, weekDates, type Session } from '../semana/kit'
import { chooseComboboxOption } from '../../../e2e/helpers/combobox'
import { createEvent, readQuote, registerPayment, sendQuote, uploadPhoto } from '../semana/ui-quotes'

interface StepResult {
  readonly step: string
  readonly ok: boolean
  readonly detail: string
  readonly image: string
}

/** El panel desplaza dentro de <main>; se libera para que la captura incluya todo el contenido. */
async function unclippedShot(page: Page, file: string): Promise<void> {
  await page.evaluate(() => {
    const main = document.querySelector('main')
    for (let el: HTMLElement | null = main; el && el !== document.body; el = el.parentElement) {
      el.dataset.prevStyle = el.getAttribute('style') ?? ''
      el.style.overflow = 'visible'
      el.style.height = 'auto'
      el.style.maxHeight = 'none'
    }
  })
  await page.screenshot({ path: file, fullPage: true })
  await page.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-prev-style]'))) {
      el.setAttribute('style', el.dataset.prevStyle ?? '')
      delete el.dataset.prevStyle
    }
  })
}

async function main(): Promise<void> {
  const base = process.argv[2] ?? 'http://localhost:3100'
  const out = path.resolve(process.argv[3] ?? path.resolve(__dirname, '../../../../../docs/handoff/movil-local/interaccion'))
  if (!/localhost|127\.0\.0\.1/.test(base)) throw new Error('Esta pasada crea datos: solo en local')
  mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Monterrey' })
  await ctx.addInitScript('window.__name = (fn) => fn')
  const page = await ctx.newPage()
  const rec = new Recorder(out, weekDates(false))
  const s: Session = { page, base, rec, pacer: new Pacer(base, false, (t) => rec.log(t)) }
  rec.startDay(1, 'Celular', 'Pasada funcional en celular')
  const results: StepResult[] = []
  const run = async (step: string, fn: () => Promise<string>): Promise<void> => {
    const image = `${String(results.length + 1).padStart(2, '0')}-${step.replace(/\W+/g, '-').toLowerCase()}.png`
    try {
      const detail = await fn()
      await page.screenshot({ path: path.join(out, image), fullPage: true })
      results.push({ step, ok: true, detail, image })
    } catch (e) {
      await page.screenshot({ path: path.join(out, image), fullPage: true }).catch(() => undefined)
      results.push({ step, ok: false, detail: (e as Error).message.split('\n').slice(0, 30).join(' | '), image })
    }
    process.stdout.write(`${results.at(-1)?.ok ? 'OK ' : 'FALLA'} ${step}: ${results.at(-1)?.detail}\n`)
  }
  try {
    await run('login', async () => {
      await page.goto(`${base}/login`)
      await page.locator('input[name=email]').fill(process.env.AUDIT_EMAIL ?? '')
      await page.locator('input[name=password]').fill(process.env.AUDIT_PASSWORD ?? '')
      await Promise.all([page.waitForURL(/\/dashboard/, { timeout: 90_000 }), page.locator('button[type=submit]').click()])
      return page.url()
    })
    await run('cotizar cancel con motor', async () => {
      await page.goto(`${base}/dashboard/quotes/new`)
      const client = page.locator('input[name="client_id"]')
      await client.fill('Lorena')
      await page.getByRole('button', { name: /Lorena/ }).first().click()
      // En celular la partida usa el <select> de la vista md:hidden en lugar del buscador en línea.
      const select = page.locator('select:has(option:text("Servicio libre")):visible').first()
      const value = await select.locator('option', { hasText: 'Cancel de baño' }).first().getAttribute('value')
      await select.selectOption(value ?? '')
      await page.getByTestId('item-0-panel').waitFor()
      await page.locator('#item-0-ancho').fill('1500')
      await page.locator('#item-0-alto').fill('1900')
      await chooseComboboxOption(page, 'item-0-espesor', '9')
      await chooseComboboxOption(page, 'item-0-herraje', 'Corredizo acero')
      await page.waitForTimeout(800)
      await unclippedShot(page, path.join(out, 'cotizacion-llena-completa.png'))
      return 'cancel 1500 x 1900 configurado'
    })
    let quoteId = ''
    await run('guardar cotización', async () => {
      await page.getByTestId('submit-quote-btn-mobile').click()
      await page.waitForURL(/\/dashboard\/quotes(\?|$)/, { timeout: 30_000 })
      await page.getByRole('link', { name: 'Ver' }).first().click()
      await page.waitForURL(/\/dashboard\/quotes\/[0-9a-f-]{36}$/)
      const q = await readQuote(s)
      quoteId = q.id
      return `${q.number} total ${q.total}`
    })
    await run('detalle completo', async () => {
      await unclippedShot(page, path.join(out, 'detalle-completo.png'))
      return 'captura sin recorte en detalle-completo.png'
    })
    await run('registrar anticipo', async () => {
      await registerPayment(s, { amount: 1000, type: 'anticipo', method: 'transferencia', date: todayIso(false), notes: 'Anticipo de prueba en celular' })
      return 'pago registrado'
    })
    await run('enviar por WhatsApp', async () => sendQuote(s, 'WhatsApp'))
    await run('subir foto antes', async () => {
      await page.goto(`${base}/dashboard/quotes/${quoteId}`, { waitUntil: 'networkidle' })
      await uploadPhoto(s, browser, 'Antes', 'Baño antes del cancel', 'before')
      return 'foto subida'
    })
    await run('crear evento', async () => {
      const day = todayIso(false)
      await createEvent(s, { title: 'Instalación cancel — prueba celular', type: 'Instalación', start: `${day}T16:00`, end: `${day}T17:30`, address: 'Av. Prueba 123, Monterrey', notes: 'Prueba en celular', client: 'Lorena' })
      return 'evento creado'
    })
    await run('agenda tras crear', async () => {
      await page.goto(`${base}/dashboard/calendar`, { waitUntil: 'networkidle' })
      await unclippedShot(page, path.join(out, 'agenda-completa.png'))
      return 'captura sin recorte en agenda-completa.png'
    })
    for (const route of ['/dashboard', '/dashboard/analytics', '/dashboard/vitrina', '/dashboard/quotes/new']) {
      await run(`completa ${route}`, async () => {
        await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
        await unclippedShot(page, path.join(out, `completa-${route.split('/').pop()}.png`))
        return 'ok'
      })
    }
  } finally {
    writeFileSync(path.join(out, 'interaccion.json'), JSON.stringify(results, null, 2))
    await browser.close()
  }
}

void main()
