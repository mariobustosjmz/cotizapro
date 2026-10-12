import { evaluateProduct, selectOptions, validateProduct } from '@cotizapro/quoting'
import type { InputValue, PriceList, ProductDefinition, QuoteLineResult } from '@cotizapro/quoting'

export type ItemInput = Readonly<Record<string, InputValue>>

export interface PreviewState {
  readonly definition: ProductDefinition | null
  readonly result: QuoteLineResult | null
  readonly errors: readonly string[]
}

/** Valores iniciales: default de cada campo, primera opción en selects; números sin default quedan vacíos. */
export function defaultInputs(definition: ProductDefinition, priceLists: readonly PriceList[]): ItemInput {
  const entries = definition.inputs.flatMap((field): [string, InputValue][] => {
    if (field.kind === 'boolean') return [[field.key, field.default ?? false]]
    if (field.kind === 'select') {
      const first = selectOptions(field, priceLists)[0]
      return first ? [[field.key, first]] : []
    }
    return field.default !== undefined ? [[field.key, field.default]] : []
  })
  return Object.fromEntries(entries)
}

export function previewItem(name: string, rawDefinition: unknown, priceLists: readonly PriceList[], input: ItemInput): PreviewState {
  const definition = validateProduct(rawDefinition, priceLists)
  if (!definition.ok) return { definition: null, result: null, errors: definition.errors }
  const result = evaluateProduct(definition.value, input, { name, priceLists })
  return result.ok
    ? { definition: definition.value, result: result.value, errors: [] }
    : { definition: definition.value, result: null, errors: result.errors }
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

export { formatAmount } from '@/lib/format/money'
