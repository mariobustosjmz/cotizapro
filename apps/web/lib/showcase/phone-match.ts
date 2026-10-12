/** Últimos 10 dígitos: compara teléfonos de México sin importar lada internacional ni formato. */
export function phoneKey(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '')
  return digits.length > 10 ? digits.slice(-10) : digits
}
