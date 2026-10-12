import { priceListSchema } from '@cotizapro/quoting'
import type { PriceList } from '@cotizapro/quoting'
import type { MemberContext } from '@/lib/auth/require-member'
import type { PricingContext, PricingProduct, QuoteItemUnitType } from './types'

export type OrgScope = Pick<MemberContext, 'supabase' | 'organizationId'>

const PRICE_LIST_COLUMNS = 'id, name, unit, dimensions, rows'
const MAX_PRICE_LISTS = 200

export async function loadPriceLists(ctx: OrgScope): Promise<readonly PriceList[]> {
  const { data, error } = await ctx.supabase
    .from('price_lists')
    .select(PRICE_LIST_COLUMNS)
    .eq('organization_id', ctx.organizationId)
    .eq('is_active', true)
    .order('name')
    .limit(MAX_PRICE_LISTS)
  if (error) throw new Error(`No se pudieron cargar las listas de precios: ${error.message}`)
  return (data ?? []).flatMap((row) => {
    const parsed = priceListSchema.safeParse(row)
    return parsed.success ? [parsed.data] : []
  })
}

export async function loadPricingContext(ctx: OrgScope, serviceIds: readonly string[]): Promise<PricingContext> {
  const ids = [...new Set(serviceIds)]
  const [priceLists, services] = await Promise.all([
    loadPriceLists(ctx),
    ids.length === 0
      ? Promise.resolve({ data: [], error: null })
      : ctx.supabase
          .from('service_catalog')
          .select('id, name, unit_type, pricing_blocks')
          .eq('organization_id', ctx.organizationId)
          .in('id', ids)
          .limit(ids.length),
  ])
  if (services.error) throw new Error(`No se pudieron cargar los servicios: ${services.error.message}`)
  const products = new Map<string, PricingProduct>(
    (services.data ?? []).map((s) => [
      s.id as string,
      { id: s.id as string, name: s.name as string, unit_type: s.unit_type as QuoteItemUnitType, pricing_blocks: s.pricing_blocks },
    ]),
  )
  return { products, priceLists }
}
