import type { PriceList, ProductDefinition } from '../types'

export type TradeKey = 'glass' | 'plumbing' | 'electrical' | 'hvac' | 'sewing' | 'general'

export type CatalogUnitType = 'fixed' | 'per_hour' | 'per_sqm' | 'per_unit' | 'per_lm'

export interface TemplateProduct {
  readonly name: string
  readonly category: string
  readonly description: string
  readonly unitType: CatalogUnitType
  /** Precio de referencia "desde", usado en la vitrina y como precio simple si no hay definición. */
  readonly unitPrice: number
  readonly definition: ProductDefinition | null
}

export interface TradeTemplate {
  readonly key: TradeKey
  readonly name: string
  readonly description: string
  readonly version: number
  readonly priceLists: readonly PriceList[]
  readonly products: readonly TemplateProduct[]
}

export interface InstantiatedTemplate {
  readonly priceLists: readonly PriceList[]
  readonly products: readonly TemplateProduct[]
}
