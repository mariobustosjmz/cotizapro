/**
 * Piezas del recorrido de evidencia D1 + D2: contextos de navegador, inicio de sesión por el formulario,
 * capturas numeradas, registro de pasos (steps.json) y consultas de solo lectura a la base local.
 * La contraseña demo se lee de apps/web/.env.local y nunca se escribe en disco ni en la salida.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import * as dotenv from 'dotenv'
import type { Browser, BrowserContext, Locator, Page } from '@playwright/test'

dotenv.config({ path: path.resolve(__dirname, '../../../.env.local'), quiet: true })

export const BASE = process.env.WALK_BASE ?? 'http://localhost:3100'
export const OUT_DIR = path.resolve(__dirname, '../../../../../docs/handoff/evidencia-d1-d2')
export const LOCAL_DB = 'postgresql://postgres:postgres@127.0.0.1:54332/postgres'
export const MEGAGLASS = 'direccion@megaglass.demo.cotizapro.mx'
export const DON_BETO = 'beto@plomeria.demo.cotizapro.mx'
export const DON_BETO_ORG = '00000000-0000-0000-00c0-000000000003'
export const NAV_TIMEOUT = 120_000

const HIDE_DEV = 'nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }'

export type Device = 'escritorio' | 'celular'

export interface Step {
  readonly n: number
  readonly scene: number
  readonly id: string
  readonly title: string
  readonly image: string
  readonly url: string
  readonly device: Device
  readonly at: string
  readonly facts: Readonly<Record<string, string>>
}

export interface Run {
  readonly base: string
  readonly startedAt: string
  finishedAt: string
  readonly steps: Step[]
  readonly notes: string[]
  readonly records: Record<string, unknown>
}

export function loadRun(): Run {
  return JSON.parse(readFileSync(path.join(OUT_DIR, 'steps.json'), 'utf8')) as Run
}

export function newRun(): Run {
  return { base: BASE, startedAt: new Date().toISOString(), finishedAt: '', steps: [], notes: [], records: {} }
}

export function log(message: string): void {
  process.stdout.write(`[${new Date().toLocaleTimeString('es-MX', { hour12: false })}] ${message}\n`)
}

function demoPassword(): string {
  const value = process.env.SEED_DEMO_PASSWORD
  if (!value) throw new Error('Falta SEED_DEMO_PASSWORD en apps/web/.env.local')
  return value
}

export async function newContext(browser: Browser, device: Device): Promise<BrowserContext> {
  const common = { locale: 'es-MX', timezoneId: 'America/Monterrey' } as const
  const ctx = await browser.newContext(device === 'celular'
    ? { ...common, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { ...common, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 })
  await ctx.addInitScript('window.__name = (fn) => fn')
  ctx.setDefaultTimeout(60_000)
  ctx.setDefaultNavigationTimeout(NAV_TIMEOUT)
  return ctx
}

export async function login(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(demoPassword())
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: NAV_TIMEOUT }),
    page.locator('button[type="submit"]').click(),
  ])
  await settle(page)
}

export async function go(page: Page, route: string): Promise<void> {
  await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT })
  await settle(page)
}

/** Espera red quieta sin fallar si hay sondeos abiertos (campana, realtime). */
export async function settle(page: Page, extraMs = 800): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined)
  await page.waitForTimeout(extraMs)
}

export async function text(locator: Locator): Promise<string> {
  return ((await locator.first().innerText()) ?? '').replace(/\s+/g, ' ').trim()
}

/** El panel desplaza dentro de <main>; se libera para que la captura de página completa lo incluya. */
async function unclipMain(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (let el: HTMLElement | null = document.querySelector('main'); el && el !== document.body; el = el.parentElement) {
      el.style.overflow = 'visible'
      el.style.height = 'auto'
      el.style.maxHeight = 'none'
    }
  })
}

export interface ShotOptions {
  readonly full?: boolean
  readonly clip?: Locator
}

export class Recorder {
  private counter = 0

  constructor(private readonly run: Run) {
    mkdirSync(OUT_DIR, { recursive: true })
  }

  async shot(page: Page, scene: number, id: string, title: string, facts: Readonly<Record<string, string>>, opts: ShotOptions = {}): Promise<void> {
    this.counter += 1
    const n = this.counter
    const image = `${String(n).padStart(2, '0')}-${id}.png`
    const file = path.join(OUT_DIR, image)
    await page.addStyleTag({ content: HIDE_DEV })
    if (opts.clip) {
      await opts.clip.screenshot({ path: file })
    } else {
      if (opts.full) await unclipMain(page)
      await page.screenshot({ path: file, fullPage: opts.full ?? false })
    }
    const device: Device = (page.viewportSize()?.width ?? 1280) < 600 ? 'celular' : 'escritorio'
    this.run.steps.push({ n, scene, id, title, image, url: page.url(), device, at: new Date().toISOString(), facts })
    log(`captura ${image} · ${title}`)
    this.save()
  }

  note(message: string): void {
    this.run.notes.push(message)
    log(`nota: ${message}`)
    this.save()
  }

  record(key: string, value: unknown): void {
    this.run.records[key] = value
    this.save()
  }

  save(): void {
    writeFileSync(path.join(OUT_DIR, 'steps.json'), JSON.stringify(this.run, null, 2))
  }

  finish(): void {
    this.run.finishedAt = new Date().toISOString()
    this.save()
  }
}

/** Consulta de solo lectura (SELECT) a la base local; devuelve filas como objetos JSON. */
export function readOnlyQuery<T>(sql: string): readonly T[] {
  if (!/^\s*select\b/i.test(sql)) throw new Error('Solo se permiten consultas SELECT')
  const wrapped = `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`
  const out = execFileSync('psql', [LOCAL_DB, '-At', '-q', '-v', 'ON_ERROR_STOP=1', '-c', 'set default_transaction_read_only = on', '-c', wrapped], { encoding: 'utf8' })
  const json = out.trim()
  return json.startsWith('[') ? (JSON.parse(json) as T[]) : []
}

export interface DonBetoRow {
  readonly plan: string
  readonly subscription_status: string
  readonly current_period_end: string | null
  readonly billing_provider: string | null
  readonly billing_reference: string | null
}

export function donBetoState(): DonBetoRow | null {
  return readOnlyQuery<DonBetoRow>(`select plan, subscription_status, current_period_end, billing_provider, billing_reference from organizations where id = '${DON_BETO_ORG}'`)[0] ?? null
}

export function platformAdminCount(): number {
  return readOnlyQuery<{ n: number }>('select count(*)::int as n from platform_admins')[0]?.n ?? -1
}
