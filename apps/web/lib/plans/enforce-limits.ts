import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { isPlanId } from './catalog'
import { checkMonthlyQuotes, checkSeatLimit, monthStartIso, planLimitsEnforced } from './limits'
import type { LimitCheck, PlanId } from './types'

export function limitExceededResponse(check: Extract<LimitCheck, { allowed: false }>): NextResponse {
  return NextResponse.json({ error: check.message, code: check.code, upgrade_to: check.upgradeTo }, { status: 402 })
}

async function organizationPlan(supabase: SupabaseClient, organizationId: string): Promise<PlanId | null> {
  const { data, error } = await supabase.from('organizations').select('plan').eq('id', organizationId).single()
  if (error || !data) {
    logger.error('Organization plan lookup failed', error, { organizationId })
    return null
  }
  const plan = (data as { plan: string | null }).plan
  if (plan && isPlanId(plan)) return plan
  logger.warn('Unknown plan, treating as free', { organizationId, plan })
  return 'free'
}

export async function enforceMonthlyQuoteLimit(
  supabase: SupabaseClient,
  organizationId: string,
  now: Date = new Date(),
): Promise<NextResponse | null> {
  if (!planLimitsEnforced()) return null
  const plan = await organizationPlan(supabase, organizationId)
  if (!plan) return null
  const { count, error } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', monthStartIso(now))
  if (error) {
    logger.error('Monthly quote count failed', error, { organizationId })
    return null
  }
  const check = checkMonthlyQuotes(plan, count ?? 0)
  return check.allowed ? null : limitExceededResponse(check)
}

export async function enforceSeatLimit(
  supabase: SupabaseClient,
  organizationId: string,
  now: Date = new Date(),
): Promise<NextResponse | null> {
  if (!planLimitsEnforced()) return null
  const plan = await organizationPlan(supabase, organizationId)
  if (!plan) return null
  const [members, pending] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    supabase
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .gt('expires_at', now.toISOString()),
  ])
  if (members.error || pending.error) {
    logger.error('Seat count failed', members.error ?? pending.error, { organizationId })
    return null
  }
  const check = checkSeatLimit(plan, members.count ?? 0, pending.count ?? 0)
  return check.allowed ? null : limitExceededResponse(check)
}
