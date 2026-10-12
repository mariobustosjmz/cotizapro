/** Formato de lectura para teléfonos de México; otros números se devuelven tal cual. */
export function formatMxPhone(digits: string): string {
  const local = digits.length === 12 && digits.startsWith('52') ? digits.slice(2) : digits
  if (local.length !== 10) return digits
  const formatted = `${local.slice(0, 2)} ${local.slice(2, 6)} ${local.slice(6)}`
  return local === digits ? formatted : `+52 ${formatted}`
}
