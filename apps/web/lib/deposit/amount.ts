/** Porcentaje de anticipo cuando el negocio no configuró uno (spec D1, decisión 1). */
export const DEFAULT_DEPOSIT_PERCENT = 50

/** Anticipo en pesos redondeado a centavos. Se calcula en centavos para no arrastrar error de punto flotante. */
export function depositAmount(total: number | string, percent: number): number {
  const totalCents = Math.round(Number(total) * 100)
  if (!Number.isFinite(totalCents) || totalCents <= 0 || !(percent > 0)) return 0
  const boundedPercent = Math.min(percent, 100)
  return Math.round((totalCents * boundedPercent) / 100) / 100
}
