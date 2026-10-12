/**
 * Auditoría de vistas en celular y tableta: recorre cada ruta del panel y las públicas,
 * mide desborde horizontal, errores de consola, respuestas /api fallidas y objetivos táctiles chicos,
 * y guarda una captura por ruta y dispositivo.
 *   AUDIT_EMAIL=… AUDIT_PASSWORD=… pnpm exec tsx scripts/walkthrough/movil/audit.ts [base] [outDir]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'

interface Device {
  readonly id: string
  readonly width: number
  readonly height: number
  readonly mobile: boolean
}

interface PageAudit {
  readonly device: string
  readonly route: string
  readonly url: string
  readonly status: number
  readonly ms: number
  readonly overflowPx: number
  readonly offenders: readonly string[]
  readonly smallTargets: number
  readonly smallExamples: readonly string[]
  readonly consoleErrors: readonly string[]
  readonly failedApi: readonly string[]
  readonly image: string
  readonly error?: string
}

interface Metrics {
  readonly overflowPx: number
  readonly offenders: string[]
  readonly smallTargets: number
  readonly smallExamples: string[]
}

const DEVICES: readonly Device[] = [
  { id: 'celular', width: 390, height: 844, mobile: true },
  { id: 'celular-chico', width: 360, height: 740, mobile: true },
  { id: 'tableta', width: 820, height: 1180, mobile: true },
  { id: 'tableta-horizontal', width: 1180, height: 820, mobile: true },
]

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/privacidad', '/terminos']

const PANEL_ROUTES = [
  '/dashboard', '/dashboard/bienvenida', '/dashboard/quotes', '/dashboard/quotes/new', '/dashboard/clients',
  '/dashboard/clients/new', '/dashboard/solicitudes', '/dashboard/calendar', '/dashboard/calendar/new',
  '/dashboard/reminders', '/dashboard/reminders/new', '/dashboard/services', '/dashboard/services/new',
  '/dashboard/price-lists', '/dashboard/templates', '/dashboard/vitrina', '/dashboard/analytics',
  '/dashboard/team', '/dashboard/team/invite', '/dashboard/settings', '/dashboard/settings/custom-fields',
  '/dashboard/settings/custom-fields/new', '/dashboard/billing',
]

const DETAIL_SOURCES: readonly { list: string; pattern: RegExp; suffix?: string }[] = [
  { list: '/dashboard/quotes', pattern: /^\/dashboard\/quotes\/[0-9a-f-]{36}$/ },
  { list: '/dashboard/quotes', pattern: /^\/dashboard\/quotes\/[0-9a-f-]{36}$/, suffix: '/edit' },
  { list: '/dashboard/clients', pattern: /^\/dashboard\/clients\/[0-9a-f-]{36}$/ },
  { list: '/dashboard/reminders', pattern: /^\/dashboard\/reminders\/[0-9a-f-]{36}$/ },
  { list: '/dashboard/services', pattern: /^\/dashboard\/services\/[0-9a-f-]{36}$/ },
  { list: '/dashboard/calendar', pattern: /^\/dashboard\/calendar\/[0-9a-f-]{36}\/edit$/ },
  { list: '/dashboard/settings/custom-fields', pattern: /^\/dashboard\/settings\/custom-fields\/[0-9a-f-]{36}$/ },
]

function measure(): Metrics {
  const width = window.innerWidth
  const describe = (el: Element): string => {
    const cls = typeof el.className === 'string' ? el.className.split(/\s+/).slice(0, 4).join('.') : ''
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)
    return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${text}" right=${Math.round(el.getBoundingClientRect().right)}`
  }
  const clippedByAncestor = (el: Element): boolean => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX
      if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true
    }
    return false
  }
  const over = new Set<Element>()
  for (const el of Array.from(document.querySelectorAll('body *'))) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || r.right <= width + 1) continue
    const style = getComputedStyle(el)
    if (style.position === 'fixed' || style.visibility === 'hidden') continue
    if (!clippedByAncestor(el)) over.add(el)
  }
  const outermost = Array.from(over).filter((el) => !el.parentElement || !over.has(el.parentElement))
  const interactive = Array.from(document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=combobox]'))
  const small = interactive.filter((el) => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0 || r.bottom < 0 || getComputedStyle(el).visibility === 'hidden') return false
    if (el.tagName === 'A' && el.closest('p')) return false
    return r.height < 32 || r.width < 32
  })
  return {
    overflowPx: Math.max(0, document.documentElement.scrollWidth - width),
    offenders: outermost.slice(0, 6).map(describe),
    smallTargets: small.length,
    smallExamples: small.slice(0, 5).map(describe),
  }
}

async function newContext(browser: Browser, d: Device, base: string): Promise<BrowserContext> {
  const local = /localhost|127\.0\.0\.1/.test(base)
  const ctx = await browser.newContext({
    viewport: { width: d.width, height: d.height },
    deviceScaleFactor: 2,
    isMobile: d.mobile,
    hasTouch: d.mobile,
    locale: 'es-MX',
    timezoneId: 'America/Monterrey',
    extraHTTPHeaders: local ? { 'x-forwarded-for': `10.88.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } : undefined,
  })
  // tsx envuelve las funciones con __name(); measure() se serializa al navegador y necesita ese helper.
  await ctx.addInitScript('window.__name = (fn) => fn')
  return ctx
}

async function login(page: Page, base: string): Promise<void> {
  const email = process.env.AUDIT_EMAIL
  const password = process.env.AUDIT_PASSWORD
  if (!email || !password) throw new Error('Faltan AUDIT_EMAIL / AUDIT_PASSWORD')
  await page.goto(`${base}/login`)
  await page.locator('input[name=email]').fill(email)
  await page.locator('input[name=password]').fill(password)
  await Promise.all([page.waitForURL(/\/dashboard/, { timeout: 90_000 }), page.locator('button[type=submit]').click()])
}

async function resolveDetails(page: Page, base: string): Promise<string[]> {
  const found: string[] = []
  for (const src of DETAIL_SOURCES) {
    await page.goto(`${base}${src.list}`, { waitUntil: 'networkidle', timeout: 90_000 }).catch(() => undefined)
    const hrefs = await page.locator('a[href]').evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''))
    const hit = hrefs.find((h) => src.pattern.test(h))
    if (hit) found.push(hit + (src.suffix ?? ''))
  }
  return Array.from(new Set(found))
}

async function auditRoute(ctx: BrowserContext, d: Device, base: string, route: string, out: string): Promise<PageAudit> {
  const page = await ctx.newPage()
  const consoleErrors: string[] = []
  const failedApi: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message.slice(0, 200)}`))
  page.on('response', (r) => { if (r.url().includes('/api/') && r.status() >= 400) failedApi.push(`${r.status()} ${new URL(r.url()).pathname}`) })
  const name = `${d.id}__${route.replace(/^\//, '').replace(/[/[\]]/g, '_').replace(/[0-9a-f-]{36}/g, 'id') || 'inicio'}.png`
  const started = Date.now()
  try {
    const res = await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 90_000 })
    await page.waitForTimeout(600)
    const m = await page.evaluate(measure)
    await page.screenshot({ path: path.join(out, name), fullPage: true })
    return { device: d.id, route, url: page.url(), status: res?.status() ?? 0, ms: Date.now() - started, ...m, consoleErrors, failedApi, image: name }
  } catch (e) {
    return { device: d.id, route, url: page.url(), status: 0, ms: Date.now() - started, overflowPx: 0, offenders: [], smallTargets: 0, smallExamples: [], consoleErrors, failedApi, image: '', error: (e as Error).message.split('\n')[0] }
  } finally {
    await page.close()
  }
}

async function main(): Promise<void> {
  const base = process.argv[2] ?? 'http://localhost:3100'
  const out = path.resolve(process.argv[3] ?? path.resolve(__dirname, '../../../../../docs/handoff/movil-local'))
  const panel = process.env.AUDIT_PUBLIC_ONLY ? [] : PANEL_ROUTES
  const extraPublic = (process.env.AUDIT_EXTRA_PUBLIC ?? '').split(',').filter(Boolean)
  mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  const results: PageAudit[] = []
  try {
    for (const d of DEVICES) {
      const anon = await newContext(browser, d, base)
      for (const r of [...PUBLIC_ROUTES, ...extraPublic]) {
        results.push(await auditRoute(anon, d, base, r, out))
        process.stdout.write(`[${d.id}] ${r} ok\n`)
      }
      await anon.close()
      if (!panel.length) continue
      const ctx = await newContext(browser, d, base)
      const page = await ctx.newPage()
      await login(page, base)
      const details = await resolveDetails(page, base)
      await page.close()
      for (const r of [...panel, ...details]) {
        const a = await auditRoute(ctx, d, base, r, out)
        results.push(a)
        process.stdout.write(`[${d.id}] ${r} ${a.error ? 'ERROR ' + a.error : `overflow=${a.overflowPx} small=${a.smallTargets} err=${a.consoleErrors.length} api=${a.failedApi.length} ${a.ms}ms`}\n`)
      }
      await ctx.close()
    }
  } finally {
    await browser.close()
    writeFileSync(path.join(out, 'audit.json'), JSON.stringify({ base, at: new Date().toISOString(), results }, null, 2))
  }
}

void main()
