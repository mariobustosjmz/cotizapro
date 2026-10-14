import type { SupabaseClient } from '@supabase/supabase-js'
import type { PostgrestError } from '@supabase/supabase-js'
import { activationAmount } from '@/lib/billing/activation'
import { logger } from '@/lib/logger'
import { adminRpcError, type AdminRpcError } from './rpc-errors'
import { ADMIN_PAGE_SIZE } from './schemas'
import type {
  ActivatePlanInput,
  ActivationResult,
  ActivationsResult,
  AdminActionResult,
  AdminListResult,
  AdminOrganizationRow,
  PlanActivationRow,
} from './types'

/** Traduce el error y registra los inesperados (500) para poder diagnosticarlos. */
function rpcFailure(rpc: string, error: PostgrestError, organizationId?: string): { readonly ok: false } & AdminRpcError {
  const mapped = adminRpcError(error.message)
  if (mapped.status === 500) logger.error(`${rpc} failed`, error, { organizationId })
  return { ok: false, ...mapped }
}

type OrganizationListRow = AdminOrganizationRow & { readonly total_count: number | string }

function toOrganizationRow(row: OrganizationListRow): AdminOrganizationRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    subscription_status: row.subscription_status,
    current_period_end: row.current_period_end,
    member_count: Number(row.member_count),
    created_at: row.created_at,
  }
}

export async function listAdminOrganizations(
  supabase: SupabaseClient,
  params: { readonly q: string; readonly page: number },
): Promise<AdminListResult> {
  const { data, error } = await supabase.rpc('admin_list_organizations', {
    p_search: params.q,
    p_limit: ADMIN_PAGE_SIZE,
    p_offset: (params.page - 1) * ADMIN_PAGE_SIZE,
  })
  if (error) return rpcFailure('admin_list_organizations', error)
  const rows = (data ?? []) as OrganizationListRow[]
  return { ok: true, rows: rows.map(toOrganizationRow), total: Number(rows[0]?.total_count ?? 0) }
}

export async function listPlanActivations(supabase: SupabaseClient, organizationId: string): Promise<ActivationsResult> {
  const { data, error } = await supabase.rpc('admin_list_plan_activations', { p_org: organizationId, p_limit: 20 })
  if (error) return rpcFailure('admin_list_plan_activations', error, organizationId)
  return { ok: true, rows: (data ?? []) as PlanActivationRow[] }
}

export async function activatePlan(
  supabase: SupabaseClient,
  organizationId: string,
  input: ActivatePlanInput,
): Promise<AdminActionResult> {
  const { data, error } = await supabase.rpc('admin_activate_plan', {
    p_org: organizationId,
    p_plan: input.plan,
    p_users: input.users,
    p_months: input.months,
    p_amount: activationAmount(input.plan, input.users, input.months),
    p_reference: input.reference,
  })
  if (error) return rpcFailure('admin_activate_plan', error, organizationId)
  return { ok: true, data: data as ActivationResult }
}

export async function suspendPlan(supabase: SupabaseClient, organizationId: string, reason: string): Promise<AdminActionResult> {
  const { data, error } = await supabase.rpc('admin_suspend_plan', { p_org: organizationId, p_reason: reason })
  if (error) return rpcFailure('admin_suspend_plan', error, organizationId)
  return { ok: true, data: data as ActivationResult }
}
