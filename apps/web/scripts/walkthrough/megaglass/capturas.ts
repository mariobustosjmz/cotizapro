/**
 * Capturas de la cuenta de presentación de MEGAGLASS para el documento (escritorio y celular).
 * Lee el resumen del seed (ids de cotizaciones) y las credenciales del entorno; solo navega y llena el
 * formulario de "Nueva cotización" para mostrar el motor, sin guardar nada.
 *   MG_EMAIL=… MG_PASSWORD=… pnpm exec tsx scripts/walkthrough/megaglass/capturas.ts <base> <dirEntorno>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { chooseComboboxOption } from '../../../e2e/helpers/combobox'

type Device = 'escritorio' | 'celular'

interface Shot {
  readonly id: string
  readonly device: Device
  readonly url: string
  readonly prepare?: (page: Page) => Promise<void>
  readonly full?: boolean
}

interface Summary {
  readonly slug: string
  readonly quotes: readonly { readonly key: string; readonly id: string; readonly number: string }[]
}

const HIDE_DEV = 'nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }'

async function context(browser: Browser, device: Device): Promise<BrowserContext> {
  const ctx = await browser.newContext(device === 'celular'
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-MX', timezoneId: 'America/Monterrey' }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, locale: 'es-MX', timezoneId: 'America/Monterrey' })
  await ctx.addInitScript('window.__name = (fn) => fn')
  return ctx
}

async function login(page: Page, base: string, email: string, password: string): Promise<void> {
  await page.goto(`${base}/login`)
  await page.locator('input[name=email]').fill(email)
  await page.locator('input[name=password]').fill(password)
  await Promise.all([page.waitForURL(/\/dashboard/, { timeout: 90_000 }), page.locator('button[type=submit]').click()])
}

/** El panel desplaza dentro de <main>; se libera para capturar el contenido completo. */
async function capture(page: Page, file: string, full: boolean): Promise<void> {
  await page.addStyleTag({ content: HIDE_DEV })
  if (full) {
    await page.evaluate(() => {
      for (let el: HTMLElement | null = document.querySelector('main'); el && el !== document.body; el = el.parentElement) {
        el.style.overflow = 'visible'
        el.style.height = 'auto'
        el.style.maxHeight = 'none'
      }
    })
  }
  await page.screenshot({ path: file, fullPage: full })
}

async function fillBathQuote(page: Page, device: Device): Promise<void> {
  await page.locator('input[name="client_id"]').fill('Laura')
  await page.getByRole('button', { name: /Laura/ }).first().click()
  if (device === 'celular') {
    const select = page.locator('select:has(option:text("Servicio libre")):visible').first()
    await select.selectOption((await select.locator('option', { hasText: 'Cancel de baño' }).first().getAttribute('value')) ?? '')
  } else {
    await page.locator('div.group').first().locator('button').first().click()
    await page.locator('input[placeholder="Buscar..."]').fill('Cancel de baño')
    await page.locator('div.absolute button', { hasText: 'Cancel de baño' }).first().dispatchEvent('mousedown')
  }
  await page.getByTestId('item-0-panel').waitFor()
  await page.locator('#item-0-ancho').fill('1400')
  await page.locator('#item-0-alto').fill('1900')
  await chooseComboboxOption(page, 'item-0-espesor', '9')
  await chooseComboboxOption(page, 'item-0-herraje', 'Corredizo aluminio')
  await page.waitForTimeout(800)
}

/**
 * La captura sale del entorno local: el campo "Compartir" y el QR apuntan a localhost. Se muestra la liga
 * pública de producción en el campo y se desenfoca el QR; el documento trae el QR real aparte.
 */
async function showPublicUrl(page: Page): Promise<void> {
  const publicUrl = process.env.MG_PUBLIC_URL ?? ''
  await page.evaluate((url) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (n.nodeValue?.includes('localhost')) n.nodeValue = url
    for (const el of Array.from(document.querySelectorAll<HTMLInputElement>('input'))) if (el.value.includes('localhost')) el.value = url
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('main img, main canvas, main svg'))) {
      const r = el.getBoundingClientRect()
      if (r.width >= 90 && Math.abs(r.width - r.height) < 12) el.style.filter = 'blur(7px)'
    }
  }, publicUrl)
}

function shots(summary: Summary): readonly Shot[] {
  const id = (key: string): string => summary.quotes.find((q) => q.key === key)?.id ?? ''
  const both = (sid: string, url: string, extra: Partial<Shot> = {}): Shot[] => [
    { id: `${sid}-escritorio`, device: 'escritorio', url, full: true, ...extra },
    { id: `${sid}-celular`, device: 'celular', url, full: false, ...extra },
  ]
  return [
    ...both('inicio', '/dashboard'),
    ...both('solicitudes', '/dashboard/solicitudes'),
    { id: 'clientes-escritorio', device: 'escritorio', url: '/dashboard/clients', full: true },
    { id: 'cotizaciones-escritorio', device: 'escritorio', url: '/dashboard/quotes', full: true },
    { id: 'kanban-escritorio', device: 'escritorio', url: '/dashboard/quotes?view=kanban', full: false },
    ...both('nueva-cotizacion', '/dashboard/quotes/new', { prepare: (p) => fillBathQuote(p, 'escritorio') }).map((s) => (s.device === 'celular' ? { ...s, prepare: (p: Page) => fillBathQuote(p, 'celular') } : s)),
    ...both('detalle-andrea', `/dashboard/quotes/${id('andrea')}`),
    { id: 'detalle-salinas-escritorio', device: 'escritorio', url: `/dashboard/quotes/${id('salinas')}`, full: true },
    { id: 'detalle-cantu-escritorio', device: 'escritorio', url: `/dashboard/quotes/${id('cantu')}`, full: true },
    { id: 'servicios-escritorio', device: 'escritorio', url: '/dashboard/services', full: false },
    { id: 'listas-precios-escritorio', device: 'escritorio', url: '/dashboard/price-lists', full: false },
    { id: 'plantillas-escritorio', device: 'escritorio', url: '/dashboard/templates', full: true },
    ...both('agenda', '/dashboard/calendar'),
    { id: 'recordatorios-escritorio', device: 'escritorio', url: '/dashboard/reminders', full: true },
    { id: 'mi-pagina-escritorio', device: 'escritorio', url: '/dashboard/vitrina', full: true, prepare: showPublicUrl },
    { id: 'analitica-escritorio', device: 'escritorio', url: '/dashboard/analytics', full: false },
    { id: 'equipo-escritorio', device: 'escritorio', url: '/dashboard/team', full: true },
    { id: 'configuracion-escritorio', device: 'escritorio', url: '/dashboard/settings', full: true },
  ]
}

async function main(): Promise<void> {
  const base = process.argv[2] ?? 'http://localhost:3100'
  const dir = path.resolve(process.argv[3] ?? '')
  const email = process.env.MG_EMAIL ?? ''
  const password = process.env.MG_PASSWORD ?? ''
  const summary: Summary = JSON.parse(readFileSync(path.join(dir, 'resumen.json'), 'utf8'))
  const out = path.join(dir, 'capturas')
  mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  const done: { id: string; file: string; ok: boolean; error?: string }[] = []
  try {
    for (const device of ['escritorio', 'celular'] as const) {
      const ctx = await context(browser, device)
      const page = await ctx.newPage()
      await login(page, base, email, password)
      for (const shot of shots(summary).filter((s) => s.device === device)) {
        const file = path.join(out, `${shot.id}.png`)
        try {
          await page.goto(`${base}${shot.url}`, { waitUntil: 'networkidle', timeout: 90_000 })
          await page.waitForTimeout(700)
          if (shot.prepare) await shot.prepare(page)
          await capture(page, file, shot.full ?? false)
          done.push({ id: shot.id, file: path.basename(file), ok: true })
        } catch (e) {
          done.push({ id: shot.id, file: path.basename(file), ok: false, error: (e as Error).message.split('\n')[0] })
        }
        process.stdout.write(`${done.at(-1)?.ok ? 'OK ' : 'FALLA'} ${shot.id} ${done.at(-1)?.error ?? ''}\n`)
      }
      if (device === 'escritorio') {
        await page.goto(`${base}/dashboard/quotes/${summary.quotes.find((q) => q.key === 'andrea')?.id}`, { waitUntil: 'networkidle' })
        const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'PDF', exact: true }).first().click()])
        await download.saveAs(path.join(out, 'cotizacion-andrea.pdf'))
        process.stdout.write('OK  cotizacion-andrea.pdf\n')
      }
      await ctx.close()
    }
    for (const device of ['escritorio', 'celular'] as const) {
      const ctx = await context(browser, device)
      const page = await ctx.newPage()
      await page.goto(`${base}/p/${summary.slug}`, { waitUntil: 'networkidle' })
      await capture(page, path.join(out, `pagina-publica-${device}.png`), true)
      process.stdout.write(`OK  pagina-publica-${device}\n`)
      await ctx.close()
    }
  } finally {
    writeFileSync(path.join(out, 'capturas.json'), JSON.stringify(done, null, 2))
    await browser.close()
  }
}

void main()
