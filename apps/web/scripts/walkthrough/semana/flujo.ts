/** Estado compartido de la semana y utilidades para registrar el avance de cada cotización. */
import type { Browser } from '@playwright/test'
import { mxn, type Session } from './kit'
import { readQuote, type CreatedQuote } from './ui-quotes'

export interface Week {
  readonly s: Session
  readonly browser: Browser
  readonly dates: readonly string[]
  readonly today: string
  readonly out: string
  readonly reviews: Map<string, string>
  slug: string
}

export const day = (w: Week, n: number): string => w.dates[n - 1]!

export const at = (w: Week, n: number, time: string): string => `${day(w, n)}T${time}`

/** Los recordatorios no aceptan fechas pasadas: si el día ya pasó se agenda para hoy. */
export const notBefore = (w: Week, iso: string): string => (iso < w.today ? w.today : iso)

export const half = (total: number): number => Math.round(total * 50) / 100

export function track(w: Week, key: string, client: string, kind: string, q: CreatedQuote, status: string): void {
  w.s.rec.quote({ key, client, kind, number: q.number, id: q.id, total: q.total, paid: 0, status })
  w.s.rec.log(`${q.number} para ${client}: ${mxn(q.total)} (${kind})`)
}

export function status(w: Week, key: string, value: string, paid?: number): void {
  const q = w.s.rec.quotes.get(key)
  w.s.rec.update(key, paid === undefined ? { status: value } : { status: value, paid: (q?.paid ?? 0) + paid })
  if (q) w.s.rec.log(`${q.number} (${q.client}) → ${value}${paid ? `, pago ${mxn(paid)}` : ''}`)
}

export function quoteId(w: Week, key: string): string {
  const q = w.s.rec.quotes.get(key)
  if (!q) throw new Error(`Cotización ${key} no registrada`)
  return q.id
}

/** Revisa en pantalla montos con un solo decimal ("$1,656.5"), señal de formato inconsistente. */
export async function checkMoneyFormat(w: Week, where: string): Promise<void> {
  const text = await w.s.page.locator('main').innerText()
  const bad = text.match(/\$[\d,]+\.(?:\d|\d{3,})(?!\d)/g)
  if (bad?.length) w.s.rec.finding('baja', 'Montos sin formato de dos decimales', `Se muestran importes como ${[...new Set(bad)].slice(0, 4).join(', ')} en lugar de dos decimales.`, where)
}

export async function refreshTotal(w: Week, key: string): Promise<number> {
  const q = await readQuote(w.s)
  w.s.rec.update(key, { total: q.total })
  return q.total
}
