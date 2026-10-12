/**
 * Las horas de la agenda se guardan "de pared": la hora que capturó el taller, sin zona horaria
 * (Postgres las devuelve con +00:00). Leerlas con `new Date()` las convertiría a la zona del navegador
 * y las correría; esta función devuelve un Date cuyos campos locales son exactamente la hora capturada.
 */
export function parseWallClock(value: string): Date {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return new Date(value)
  const [, y, mo, d, h, mi, s] = m
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s ?? 0))
}
