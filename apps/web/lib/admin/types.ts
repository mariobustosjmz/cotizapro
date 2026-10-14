import type { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { PlanId } from '@/lib/plans/types'

export interface AdminOrganizationRow {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly plan: string
  readonly subscription_status: string | null
  readonly current_period_end: string | null
  readonly member_count: number
  readonly created_at: string
}

export interface AdminOrganizationSummary {
  readonly id: string
  readonly name: string
  readonly planId: PlanId
  readonly memberCount: number
}

export interface PlanActivationRow {
  readonly id: string
  readonly action: 'activate' | 'suspend'
  readonly previous_plan: string
  readonly new_plan: string
  readonly users_billed: number | null
  readonly months: number | null
  /** numeric(10,2): PostgREST lo puede regresar como texto. */
  readonly amount: number | string
  readonly reference: string | null
  readonly reason: string | null
  readonly period_start: string | null
  readonly period_end: string | null
  readonly activated_by_email: string | null
  readonly created_at: string
}

export interface ActivatePlanInput {
  readonly plan: PlanId
  readonly users: number
  readonly months: number
  readonly reference: string
}

export interface ActivationResult {
  readonly organization_id: string
  readonly plan: PlanId
  readonly current_period_end: string | null
}

export interface AdminFailure {
  readonly ok: false
  readonly status: number
  readonly error: string
  readonly field?: string
}

export type AdminListResult = { readonly ok: true; readonly rows: readonly AdminOrganizationRow[]; readonly total: number } | AdminFailure
export type ActivationsResult = { readonly ok: true; readonly rows: readonly PlanActivationRow[] } | AdminFailure
export type AdminActionResult = { readonly ok: true; readonly data: ActivationResult } | AdminFailure

export type PlatformAdminResult =
  | { readonly ok: true; readonly supabase: SupabaseClient; readonly userId: string }
  | { readonly ok: false; readonly response: NextResponse }
