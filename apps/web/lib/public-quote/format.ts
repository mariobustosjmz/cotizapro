export const BUSINESS_TIME_ZONE = 'America/Monterrey'

const DATE_ONLY = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function parse(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Para columnas DATE (YYYY-MM-DD): se formatea en UTC para que México no la muestre un día antes. */
export function formatDateOnly(value: string): string {
  const date = parse(value)
  return date ? DATE_ONLY.format(date) : value
}

export function formatDateTime(value: string, timeZone: string = BUSINESS_TIME_ZONE): string {
  const date = parse(value)
  if (!date) return value
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone,
  }).format(date)
}
