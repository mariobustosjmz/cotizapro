import { BILLING_TIME_ZONE } from '@/lib/billing/expiry'

export const AI_TIME_ZONE = BILLING_TIME_ZONE

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'] as const

export interface AiPeriod {
  readonly start: string
  readonly resetsOn: string
}

const pad = (value: number): string => String(value).padStart(2, '0')

function localYearMonth(now: Date): { readonly year: number; readonly month: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: AI_TIME_ZONE, year: 'numeric', month: '2-digit' }).formatToParts(now)
  const pick = (type: 'year' | 'month'): number => {
    const value = Number(parts.find((p) => p.type === type)?.value)
    if (!Number.isInteger(value)) throw new Error(`No se pudo leer ${type} en la zona ${AI_TIME_ZONE}`)
    return value
  }
  return { year: pick('year'), month: pick('month') }
}

/** Mes calendario en Monterrey; mismo cálculo que ai_period_start() en la migración 043. */
export function aiPeriod(now: Date): AiPeriod {
  const { year, month } = localYearMonth(now)
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  return { start: `${year}-${pad(month)}-01`, resetsOn: `${next.year}-${pad(next.month)}-01` }
}

export function formatResetDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-').map(Number)
  const name = MONTHS[(month ?? 1) - 1] ?? ''
  return `${day ?? 1} de ${name}`
}
