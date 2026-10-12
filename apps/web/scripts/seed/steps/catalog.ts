import { randomUUID } from 'crypto'
import { getTradeTemplate, priceListSchema } from '@cotizapro/quoting'
import type { PriceList, TradeKey } from '@cotizapro/quoting'
import { buildTemplateRows } from '../../../lib/onboarding/template-rows'
import type { PricingProduct, QuoteItemUnitType } from '../../../lib/pricing/types'
import { type Admin, must } from '../util'

export interface SeededCatalog {
  readonly services: readonly (PricingProduct & { readonly unit_price: number })[]
  readonly priceLists: readonly PriceList[]
}

export async function seedCatalog(admin: Admin, orgId: string, trade: TradeKey): Promise<SeededCatalog> {
  const template = getTradeTemplate(trade)
  if (!template) throw new Error(`Plantilla desconocida: ${trade}`)
  const rows = buildTemplateRows(template, orgId, randomUUID)

  const lists = rows.priceLists.length
    ? must(await admin.from('price_lists').insert(rows.priceLists).select('id, name, unit, dimensions, rows'), 'insert price_lists')
    : []
  const services = must(
    await admin.from('service_catalog').insert(rows.services).select('id, name, unit_type, unit_price, pricing_blocks'),
    'insert services',
  )
  return {
    priceLists: lists.map((l) => priceListSchema.parse(l)),
    services: services.map((s) => ({
      id: s.id as string,
      name: s.name as string,
      unit_type: s.unit_type as QuoteItemUnitType,
      unit_price: Number(s.unit_price),
      pricing_blocks: s.pricing_blocks,
    })),
  }
}
