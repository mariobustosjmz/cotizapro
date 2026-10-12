import { randomUUID } from 'node:crypto'
import { getTradeTemplate } from '@cotizapro/quoting'
import type { MemberContext } from '@/lib/auth/require-member'
import type { AccountSetupInput } from '@/lib/validations/onboarding'
import { buildTemplateRows } from './template-rows'

export interface AccountSetupResult {
  readonly templateApplied: boolean
  readonly profileCreated: boolean
}

type Ctx = Pick<MemberContext, 'supabase' | 'organizationId'>

async function hasConfigurableCatalog(ctx: Ctx): Promise<boolean> {
  const { count, error } = await ctx.supabase
    .from('service_catalog')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', ctx.organizationId)
    .not('pricing_blocks', 'is', null)
  if (error) throw new Error(`No se pudo revisar el catálogo: ${error.message}`)
  return (count ?? 0) > 0
}

/**
 * Inserta listas y productos de la plantilla. Si fallan los productos se borran las listas
 * recién creadas (compensación), porque PostgREST no ofrece transacciones multi-tabla.
 */
async function applyTemplate(ctx: Ctx, trade: AccountSetupInput['trade']): Promise<boolean> {
  const template = getTradeTemplate(trade)
  if (!template || (await hasConfigurableCatalog(ctx))) return false
  const rows = buildTemplateRows(template, ctx.organizationId, () => randomUUID())
  if (rows.priceLists.length > 0) {
    const { error } = await ctx.supabase.from('price_lists').insert([...rows.priceLists])
    if (error) throw new Error(`No se pudieron crear las listas de precios: ${error.message}`)
  }
  const { error } = await ctx.supabase.from('service_catalog').insert([...rows.services])
  if (error) {
    const ids = rows.priceLists.map((l) => l.id)
    if (ids.length > 0) await ctx.supabase.from('price_lists').delete().in('id', ids)
    throw new Error(`No se pudieron crear los productos: ${error.message}`)
  }
  return true
}

async function ensureDraftProfile(ctx: Ctx, orgName: string): Promise<boolean> {
  const { data: existing } = await ctx.supabase
    .from('public_profiles')
    .select('organization_id')
    .eq('organization_id', ctx.organizationId)
    .maybeSingle()
  if (existing) return false
  const trimmed = orgName.trim().slice(0, 80)
  const displayName = trimmed.length >= 2 ? trimmed : 'Mi negocio'
  const { error } = await ctx.supabase
    .from('public_profiles')
    .insert({ organization_id: ctx.organizationId, display_name: displayName, is_published: false })
  if (error) throw new Error(`No se pudo crear la página pública: ${error.message}`)
  return true
}

export async function applyAccountSetup(ctx: Ctx, input: AccountSetupInput): Promise<AccountSetupResult> {
  const { data: org, error } = await ctx.supabase
    .from('organizations')
    .update({ account_type: input.account_type, trade: input.trade, onboarding_completed_at: new Date().toISOString() })
    .eq('id', ctx.organizationId)
    .select('name')
    .single()
  if (error || !org) throw new Error(`No se pudo actualizar la cuenta: ${error?.message ?? 'sin datos'}`)
  const templateApplied = input.apply_template ? await applyTemplate(ctx, input.trade) : false
  const profileCreated = await ensureDraftProfile(ctx, org.name as string)
  return { templateApplied, profileCreated }
}
