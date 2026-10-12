import type { PriceList, ProductDefinition, QuoteLineResult } from '@cotizapro/quoting'

export type QuoteItemUnitType = 'fixed' | 'per_hour' | 'per_sqm' | 'per_unit' | 'per_lm'

export interface PricingProduct {
  readonly id: string
  readonly name: string
  readonly unit_type: QuoteItemUnitType
  readonly pricing_blocks: unknown
}

export interface PricingContext {
  readonly products: ReadonlyMap<string, PricingProduct>
  readonly priceLists: readonly PriceList[]
}

export interface IncomingQuoteItem {
  readonly service_id?: string | null
  readonly description: string
  readonly quantity: number
  readonly unit_price: number
  readonly unit_type: QuoteItemUnitType
  readonly input?: Readonly<Record<string, unknown>> | null
}

export interface PricingSnapshot {
  readonly product: ProductDefinition
  readonly priceLists: readonly PriceList[]
}

export interface PricedQuoteItem {
  readonly service_id: string | null
  readonly description: string
  readonly quantity: number
  readonly unit_price: number
  readonly unit_type: QuoteItemUnitType
  readonly subtotal: number
  readonly input: Readonly<Record<string, unknown>> | null
  readonly breakdown: QuoteLineResult | null
  readonly pricing_snapshot: PricingSnapshot | null
}
