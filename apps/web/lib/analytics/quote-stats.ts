/** Métricas de cotizaciones y cobranza, independientes de la base de datos para poder probarlas. */

export const QUOTE_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'en_instalacion', 'completado', 'cobrado'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]
export type StatusCounts = Readonly<Record<QuoteStatus, number>>

/** Aceptada o cualquier etapa posterior: la venta está ganada. */
const WON: readonly QuoteStatus[] = ['accepted', 'en_instalacion', 'completado', 'cobrado']
/** Comprometidas con saldo por cobrar. */
const OPEN_BALANCE: readonly string[] = ['accepted', 'en_instalacion', 'completado']

const round2 = (n: number): number => Math.round(n * 100) / 100
const pct = (part: number, whole: number): number => (whole > 0 ? round2((part / whole) * 100) : 0)

export function countByStatus(rows: readonly { readonly status: string }[]): StatusCounts {
  const counts = Object.fromEntries(QUOTE_STATUSES.map((s) => [s, 0])) as Record<QuoteStatus, number>
  for (const row of rows) if (row.status in counts) counts[row.status as QuoteStatus] += 1
  return counts
}

/** Normaliza el objeto `by_status` que devuelve la API; los estados ausentes cuentan cero. */
export function toStatusCounts(record: Readonly<Record<string, number>> | null | undefined): StatusCounts {
  return Object.fromEntries(QUOTE_STATUSES.map((s) => [s, Number(record?.[s] ?? 0)])) as Record<QuoteStatus, number>
}

/** La venta está ganada: aceptada o en cualquier etapa posterior. */
export const isWon = (status: string): boolean => (WON as readonly string[]).includes(status)

const won = (c: StatusCounts): number => WON.reduce((sum, s) => sum + c[s], 0)

/** Ganadas entre decididas (ganadas + rechazadas), en %. */
export function conversionRate(c: StatusCounts): number {
  return pct(won(c), won(c) + c.rejected)
}

/** Cotizaciones que el cliente vio o contestó entre las enviadas, en %. */
export function responseRate(c: StatusCounts): number {
  const answered = c.viewed + won(c) + c.rejected
  return pct(answered, c.sent + answered)
}

export interface FunnelStage {
  readonly stage: 'Creadas' | 'Enviadas' | 'Vistas' | 'Aceptadas' | 'Cobradas'
  readonly count: number
}

/** Embudo acumulado: cada etapa incluye las cotizaciones que ya avanzaron más allá. */
export function conversionFunnel(c: StatusCounts, total: number): readonly FunnelStage[] {
  return [
    { stage: 'Creadas', count: total },
    { stage: 'Enviadas', count: c.sent + c.viewed + won(c) + c.rejected + c.expired },
    { stage: 'Vistas', count: c.viewed + won(c) },
    { stage: 'Aceptadas', count: won(c) },
    { stage: 'Cobradas', count: c.cobrado },
  ]
}

/** Dinero cobrado: suma de pagos, opcionalmente desde una fecha (YYYY-MM-DD, inclusive). */
export function collectedSince(payments: readonly { readonly amount: number | string; readonly payment_date: string }[], from?: string): number {
  return round2(payments.filter((p) => !from || p.payment_date >= from).reduce((sum, p) => sum + Number(p.amount || 0), 0))
}

/** Saldo por cobrar: por cotización comprometida, su total menos sus propios pagos (nunca negativo). */
export function pendingBalance(
  quotes: readonly { readonly id: string; readonly total: number | string; readonly status: string }[],
  payments: readonly { readonly quote_id: string; readonly amount: number | string }[],
): number {
  const paid = new Map<string, number>()
  for (const p of payments) paid.set(p.quote_id, (paid.get(p.quote_id) ?? 0) + Number(p.amount || 0))
  return round2(quotes.filter((q) => OPEN_BALANCE.includes(q.status)).reduce((sum, q) => sum + Math.max(0, Number(q.total || 0) - (paid.get(q.id) ?? 0)), 0))
}
