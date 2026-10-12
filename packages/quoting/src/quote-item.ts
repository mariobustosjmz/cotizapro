import type { BreakdownLine, QuoteLineResult } from './types'

export interface QuoteItemFields {
  readonly description: string
  readonly quantity: number
  readonly unit_price: number
  readonly unit_type: 'fixed'
  readonly subtotal: number
}

export function toQuoteItemFields(result: QuoteLineResult): QuoteItemFields {
  const pesos = result.subtotalCents / 100
  return { description: result.description, quantity: 1, unit_price: pesos, unit_type: 'fixed', subtotal: pesos }
}

export interface MaterialRow {
  readonly label: string
  readonly unit: string
  readonly quantity: number
}

const MATERIAL_KINDS: readonly BreakdownLine['kind'][] = ['material', 'accessory']

export function aggregateMaterials(breakdowns: readonly (readonly BreakdownLine[])[]): readonly MaterialRow[] {
  const totals = new Map<string, MaterialRow>()
  for (const line of breakdowns.flat()) {
    if (!MATERIAL_KINDS.includes(line.kind)) continue
    const id = `${line.label}|${line.unit}`
    const prev = totals.get(id)
    const quantity = Math.round(((prev?.quantity ?? 0) + line.quantity) * 10_000) / 10_000
    totals.set(id, { label: line.label, unit: line.unit, quantity })
  }
  return [...totals.values()]
}
