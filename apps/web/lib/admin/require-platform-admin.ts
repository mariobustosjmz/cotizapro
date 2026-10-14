import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { createServerClient } from '@/lib/supabase/server'
import type { AdminFailure, PlatformAdminResult } from './types'

export function notFoundResponse(): NextResponse {
  return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
}

export function failureResponse(failure: AdminFailure): NextResponse {
  const fieldErrors = failure.field ? { [failure.field]: failure.error } : undefined
  return NextResponse.json({ error: failure.error, ...(fieldErrors && { fieldErrors }) }, { status: failure.status })
}

export async function isPlatformAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_platform_admin')
  if (error) {
    logger.warn('is_platform_admin failed', { code: error.code })
    return false
  }
  return data === true
}

/** Exige sesión de superadmin; a cualquier otro le responde 404 para no revelar que la ruta existe. */
export async function requirePlatformAdmin(): Promise<PlatformAdminResult> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user || !(await isPlatformAdmin(supabase))) return { ok: false, response: notFoundResponse() }
  return { ok: true, supabase, userId: user.id }
}
