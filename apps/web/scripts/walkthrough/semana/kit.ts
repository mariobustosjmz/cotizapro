/**
 * Infraestructura de la simulación semanal: bitácora por día, capturas con contexto, hallazgos,
 * control del límite de peticiones de producción y fechas de la semana en curso.
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import type { BrowserContext, Page } from '@playwright/test'
import type { RenderStep } from '../render'

export interface WeekStep extends RenderStep {
  readonly id: string
  readonly day: number
  readonly at: string
}

export interface DayEntry {
  readonly n: number
  readonly date: string
  readonly title: string
  readonly summary: string
  readonly log: string[]
}

export type Severity = 'alta' | 'media' | 'baja'

export interface Finding {
  readonly severity: Severity
  readonly title: string
  readonly detail: string
  readonly where: string
}

export interface QuoteRecord {
  readonly key: string
  readonly client: string
  readonly kind: string
  number: string
  id: string
  total: number
  paid: number
  status: string
}

export interface ClientRecord {
  readonly name: string
  readonly company: string
  readonly origin: string
  readonly need: string
}

export interface ShotOptions {
  readonly id: string
  readonly title: string
  readonly area: string
  readonly what: string
  readonly apis?: readonly string[]
  readonly facts?: Readonly<Record<string, string>>
  readonly fullPage?: boolean
}

export class Recorder {
  readonly steps: WeekStep[] = []
  readonly days: DayEntry[] = []
  readonly findings: Finding[] = []
  readonly quotes = new Map<string, QuoteRecord>()
  readonly clients: ClientRecord[] = []
  private current = 0

  constructor(private readonly out: string, private readonly dates: readonly string[]) {}

  startDay(n: number, title: string, summary: string): void {
    this.current = n
    this.days.push({ n, date: this.dates[n - 1]!, title, summary, log: [] })
    process.stdout.write(`\n== Día ${n} (${this.dates[n - 1]}): ${title}\n`)
  }

  log(text: string): void {
    this.days.at(-1)?.log.push(text)
    process.stdout.write(`   · ${text}\n`)
  }

  async shot(page: Page, o: ShotOptions): Promise<void> {
    const n = this.steps.length + 1
    const image = `${String(n).padStart(2, '0')}-${o.id}.png`
    await page.waitForLoadState('networkidle').catch(() => undefined)
    await page.screenshot({ path: path.join(this.out, image), fullPage: o.fullPage ?? false })
    this.steps.push({ n, id: o.id, day: this.current, title: o.title, image, url: page.url(), area: o.area, what: o.what, apis: o.apis ?? [], facts: o.facts ?? {}, at: new Date().toISOString() })
    process.stdout.write(`  [${n}] ${o.title}\n`)
  }

  finding(severity: Severity, title: string, detail: string, where: string): void {
    if (this.findings.some((f) => f.title === title)) return
    this.findings.push({ severity, title, detail, where })
    process.stdout.write(`   ! Hallazgo (${severity}): ${title}\n`)
  }

  client(c: ClientRecord): void {
    this.clients.push(c)
  }

  quote(q: QuoteRecord): QuoteRecord {
    this.quotes.set(q.key, q)
    return q
  }

  update(key: string, patch: Partial<Omit<QuoteRecord, 'key'>>): void {
    const q = this.quotes.get(key)
    if (q) Object.assign(q, patch)
  }

  save(meta: Readonly<Record<string, unknown>>): void {
    const data = { ...meta, days: this.days, steps: this.steps, findings: this.findings, quotes: [...this.quotes.values()], clients: this.clients }
    writeFileSync(path.join(this.out, 'semana.json'), JSON.stringify(data, null, 2))
  }
}

/**
 * Producción limita a 100 peticiones /api cada 15 min por IP (lib/rate-limit.ts). El pacer cuenta las
 * peticiones de todos los contextos y espera antes de cada acción si la siguiente podría rebasar el límite.
 */
export class Pacer {
  private readonly times: number[] = []
  total = 0
  throttled = 0
  pausedMs = 0

  constructor(
    private readonly base: string,
    private readonly enabled: boolean,
    private readonly log: (text: string) => void,
    private readonly limit = 88,
    private readonly windowMs = 15 * 60_000,
  ) {}

  attach(ctx: BrowserContext): void {
    ctx.on('request', (r) => {
      if (!r.url().startsWith(`${this.base}/api/`)) return
      this.times.push(Date.now())
      this.total += 1
    })
    ctx.on('response', (r) => {
      if (r.status() === 429 && r.url().startsWith(this.base)) this.throttled += 1
    })
  }

  async gate(expected = 12): Promise<void> {
    if (!this.enabled) return
    for (;;) {
      const now = Date.now()
      while (this.times.length && this.times[0]! < now - this.windowMs) this.times.shift()
      if (this.times.length + expected <= this.limit) return
      const wait = this.times[0]! + this.windowMs - now + 1500
      this.log(`Pausa de ${Math.ceil(wait / 1000)} s para respetar el límite de 100 peticiones cada 15 min`)
      this.pausedMs += wait
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
}

/** Fechas lunes a domingo de la semana que la agenda considera "actual" (semana que empieza en lunes). */
export function weekDates(useUtc: boolean, now = new Date()): string[] {
  const y = useUtc ? now.getUTCFullYear() : now.getFullYear()
  const m = useUtc ? now.getUTCMonth() : now.getMonth()
  const d = useUtc ? now.getUTCDate() : now.getDate()
  const dow = new Date(Date.UTC(y, m, d)).getUTCDay()
  const monday = Date.UTC(y, m, d - (dow === 0 ? 6 : dow - 1))
  return Array.from({ length: 7 }, (_, i) => new Date(monday + i * 86_400_000).toISOString().slice(0, 10))
}

export function todayIso(useUtc: boolean, now = new Date()): string {
  if (useUtc) return now.toISOString().slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

/** "$12,009.61" → 12009.61 */
export function money(text: string): number {
  return Number(text.replace(/[^0-9.]/g, ''))
}

export function mxn(value: number): string {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export interface Session {
  readonly page: Page
  readonly base: string
  readonly rec: Recorder
  readonly pacer: Pacer
}

/** Espera el aviso (toast) con ese texto. */
export async function toast(page: Page, text: string | RegExp, timeout = 20_000): Promise<string> {
  const alert = page.getByRole('alert').filter({ hasText: text }).first()
  await alert.waitFor({ timeout })
  return (await alert.textContent())?.trim() ?? ''
}
