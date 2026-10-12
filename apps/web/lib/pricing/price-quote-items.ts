import { evaluateProduct, findPriceList, toQuoteItemFields, usedPriceListIds, validateProduct } from '@cotizapro/quoting'
import type { PriceList, Result } from '@cotizapro/quoting'
import type { IncomingQuoteItem, PricedQuoteItem, PricingContext } from './types'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function priceSimple(item: IncomingQuoteItem): PricedQuoteItem {
  return {
    service_id: item.service_id ?? null,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    unit_type: item.unit_type,
    subtotal: round2(item.quantity * item.unit_price),
    input: null,
    breakdown: null,
    pricing_snapshot: null,
  }
}

function priceConfigurable(item: IncomingQuoteItem, ctx: PricingContext): Result<PricedQuoteItem> {
  const product = item.service_id ? ctx.products.get(item.service_id) : undefined
  if (!product || product.pricing_blocks == null) {
    return { ok: false, errors: ['El servicio no es un producto configurable'] }
  }
  const definition = validateProduct(product.pricing_blocks, ctx.priceLists)
  if (!definition.ok) return definition
  const result = evaluateProduct(definition.value, item.input ?? {}, { name: product.name, priceLists: ctx.priceLists })
  if (!result.ok) return result

  const usedLists = usedPriceListIds(definition.value)
    .map((id) => findPriceList(ctx.priceLists, id))
    .filter((l): l is PriceList => l !== undefined)
  const fields = toQuoteItemFields(result.value)
  return {
    ok: true,
    value: {
      ...fields,
      service_id: product.id,
      input: result.value.input,
      breakdown: result.value,
      pricing_snapshot: { product: definition.value, priceLists: usedLists },
    },
  }
}

/**
 * Valora todas las partidas en el servidor. Las configurables se recalculan con el motor
 * e ignoran descripción y precio enviados por el cliente.
 */
export function priceQuoteItems(items: readonly IncomingQuoteItem[], ctx: PricingContext): Result<readonly PricedQuoteItem[]> {
  const priced = items.map((item, index) => {
    const res = item.input ? priceConfigurable(item, ctx) : ({ ok: true, value: priceSimple(item) } as const)
    return res.ok ? res : { ok: false as const, errors: res.errors.map((e) => `Partida ${index + 1}: ${e}`) }
  })
  const errors = priced.flatMap((r) => (r.ok ? [] : r.errors))
  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, value: priced.flatMap((r) => (r.ok ? [r.value] : [])) }
}
