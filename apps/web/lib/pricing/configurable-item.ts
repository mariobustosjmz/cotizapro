import { validateProduct } from '@cotizapro/quoting'
import type { PriceList } from '@cotizapro/quoting'
import { defaultInputs, type ItemInput, type PreviewState, previewItem } from './client-preview'

export interface ConfigurableItemPatch {
  readonly description: string
  readonly quantity: number
  readonly unit_price: number
  readonly unit_type: 'fixed'
  readonly input: ItemInput
}

/** Estado inicial de una partida al elegir un producto configurable. */
export function initialConfigurableItem(name: string, definition: unknown, priceLists: readonly PriceList[]): ConfigurableItemPatch | null {
  const parsed = validateProduct(definition, priceLists)
  if (!parsed.ok) return null
  const input = defaultInputs(parsed.value, priceLists)
  return patchFromPreview(name, input, previewItem(name, definition, priceLists, input))
}

/** Lleva el resultado del motor a los campos de la partida (precio 0 mientras falten datos). */
export function patchFromPreview(name: string, input: ItemInput, preview: PreviewState): ConfigurableItemPatch {
  return {
    description: preview.result?.description ?? name,
    quantity: 1,
    unit_price: preview.result ? preview.result.subtotalCents / 100 : 0,
    unit_type: 'fixed',
    input,
  }
}
