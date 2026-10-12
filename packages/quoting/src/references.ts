import type { Block, ProductDefinition, Rate } from './types'

function rateListIds(rate: Rate): readonly string[] {
  return rate.kind === 'price_list' ? [rate.listId] : []
}

function blockListIds(block: Block): readonly string[] {
  if (block.type === 'base_price' || block.type === 'accessory') return rateListIds(block.rate)
  if (block.type === 'surcharge' && block.mode === 'per_measure') return rateListIds(block.rate)
  return []
}

/** IDs de listas de precios que un producto necesita para calcularse. */
export function usedPriceListIds(product: ProductDefinition): readonly string[] {
  const fromInputs = product.inputs.flatMap((f) => (f.kind === 'select' && f.fromPriceList ? [f.fromPriceList.listId] : []))
  const fromBlocks = product.blocks.flatMap(blockListIds)
  return [...new Set([...fromInputs, ...fromBlocks])]
}
