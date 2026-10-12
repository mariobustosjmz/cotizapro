import type { Result } from '@cotizapro/quoting'
import { loadPricingContext, type OrgScope } from './load-pricing-context'
import { priceQuoteItems } from './price-quote-items'
import type { IncomingQuoteItem, PricedQuoteItem, PricingContext } from './types'

const EMPTY_CONTEXT: PricingContext = { products: new Map(), priceLists: [] }

/** Valora en servidor las partidas de una cotización; solo consulta catálogo si hay partidas configurables. */
export async function priceItemsForOrg(scope: OrgScope, items: readonly IncomingQuoteItem[]): Promise<Result<readonly PricedQuoteItem[]>> {
  const configurableIds = items.flatMap((i) => (i.input && i.service_id ? [i.service_id] : []))
  const ctx = configurableIds.length > 0 ? await loadPricingContext(scope, configurableIds) : EMPTY_CONTEXT
  return priceQuoteItems(items, ctx)
}

export function sumSubtotals(items: readonly PricedQuoteItem[]): number {
  return Math.round(items.reduce((acc, i) => acc + i.subtotal, 0) * 100) / 100
}
