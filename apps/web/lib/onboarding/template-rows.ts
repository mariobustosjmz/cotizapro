import { instantiateTemplate } from '@cotizapro/quoting'
import type { TradeTemplate } from '@cotizapro/quoting'

export interface PriceListRow {
  readonly id: string
  readonly organization_id: string
  readonly name: string
  readonly unit: string
  readonly dimensions: readonly string[]
  readonly rows: unknown
}

export interface ServiceRow {
  readonly organization_id: string
  readonly name: string
  readonly category: string
  readonly description: string
  readonly unit_price: number
  readonly unit_type: string
  readonly pricing_blocks: unknown
  readonly is_active: boolean
}

export interface TemplateRows {
  readonly priceLists: readonly PriceListRow[]
  readonly services: readonly ServiceRow[]
}

/** Convierte una plantilla de giro en filas listas para insertar, con UUIDs nuevos para las listas. */
export function buildTemplateRows(template: TradeTemplate, organizationId: string, newId: () => string): TemplateRows {
  const instantiated = instantiateTemplate(template, () => newId())
  return {
    priceLists: instantiated.priceLists.map((list) => ({
      id: list.id,
      organization_id: organizationId,
      name: list.name,
      unit: list.unit,
      dimensions: list.dimensions,
      rows: list.rows,
    })),
    services: instantiated.products.map((product) => ({
      organization_id: organizationId,
      name: product.name,
      category: product.category,
      description: product.description,
      unit_price: product.unitPrice,
      unit_type: product.unitType,
      pricing_blocks: product.definition,
      is_active: true,
    })),
  }
}
