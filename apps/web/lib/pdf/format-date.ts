const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

/** Las columnas DATE se formatean en UTC para no recorrerse un día; los timestamptz en hora de Monterrey. */
export function formatPdfDate(value: string): string {
  const timeZone = DATE_ONLY.test(value) ? 'UTC' : 'America/Monterrey'
  return new Date(value).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  })
}
