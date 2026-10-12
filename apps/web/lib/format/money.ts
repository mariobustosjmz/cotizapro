/** Importe en pesos con 2 decimales fijos, sin símbolo (la vista antepone "$"). */
export function formatAmount(pesos: number | string | null | undefined): string {
  const value = Number(pesos)
  return (Number.isFinite(value) ? value : 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
