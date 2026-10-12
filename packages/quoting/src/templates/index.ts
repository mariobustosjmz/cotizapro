import type { Block, InputField, PriceList, ProductDefinition, Rate } from '../types'
import { GLASS_TEMPLATE } from './glass'
import { ELECTRICAL_TEMPLATE, GENERAL_TEMPLATE, HVAC_TEMPLATE, PLUMBING_TEMPLATE, SEWING_TEMPLATE } from './trades'
import type { InstantiatedTemplate, TradeKey, TradeTemplate } from './types'

export const TRADE_TEMPLATES: readonly TradeTemplate[] = [
  GLASS_TEMPLATE,
  PLUMBING_TEMPLATE,
  ELECTRICAL_TEMPLATE,
  HVAC_TEMPLATE,
  SEWING_TEMPLATE,
  GENERAL_TEMPLATE,
]

export function getTradeTemplate(key: string): TradeTemplate | undefined {
  return TRADE_TEMPLATES.find((t) => t.key === (key as TradeKey))
}

type IdMap = Readonly<Record<string, string>>

function remapRate(rate: Rate, ids: IdMap): Rate {
  return rate.kind === 'price_list' ? { ...rate, listId: ids[rate.listId] ?? rate.listId } : rate
}

function remapBlock(block: Block, ids: IdMap): Block {
  if (block.type === 'base_price' || block.type === 'accessory') return { ...block, rate: remapRate(block.rate, ids) }
  if (block.type === 'surcharge' && block.mode === 'per_measure') return { ...block, rate: remapRate(block.rate, ids) }
  return block
}

function remapInput(field: InputField, ids: IdMap): InputField {
  if (field.kind !== 'select' || !field.fromPriceList) return field
  const listId = ids[field.fromPriceList.listId] ?? field.fromPriceList.listId
  return { ...field, fromPriceList: { ...field.fromPriceList, listId } }
}

function remapDefinition(definition: ProductDefinition, ids: IdMap): ProductDefinition {
  return {
    ...definition,
    inputs: definition.inputs.map((f) => remapInput(f, ids)),
    blocks: definition.blocks.map((b) => remapBlock(b, ids)),
  }
}

/** Devuelve copia de la plantilla con IDs de listas reales (p. ej. UUIDs de la base). */
export function instantiateTemplate(template: TradeTemplate, newId: (localId: string) => string): InstantiatedTemplate {
  const ids: IdMap = Object.fromEntries(template.priceLists.map((l) => [l.id, newId(l.id)]))
  const priceLists: PriceList[] = template.priceLists.map((l) => ({ ...l, id: ids[l.id]! }))
  const products = template.products.map((p) => (p.definition ? { ...p, definition: remapDefinition(p.definition, ids) } : p))
  return { priceLists, products }
}
