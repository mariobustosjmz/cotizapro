import type { NextRequest } from 'next/server'
import { z } from 'zod'
import type { MemberContext, MemberRole } from '@/lib/auth/require-member'
import { requireWritableMember } from '@/lib/billing/require-writable-member'
import { logger } from '@/lib/logger'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { AiError } from './errors'
import { aiErrorResponse } from './http'
import type { AiRunContext } from './run'
import { aiRuntime, type AiRuntime } from './runtime'

export interface AiOrgInfo {
  readonly name: string
  readonly trade: string | null
}

export type AiRouteResult =
  | { readonly ok: true; readonly member: MemberContext; readonly org: AiOrgInfo; readonly runtime: AiRuntime }
  | { readonly ok: false; readonly response: Response }

const orgSchema = z.object({ name: z.string(), trade: z.string().nullable() })
export const AI_EDITOR_ROLES: readonly MemberRole[] = ['owner', 'admin', 'member']
export const AI_ADMIN_ROLES: readonly MemberRole[] = ['owner', 'admin']
const FALLBACK_ORG: AiOrgInfo = { name: 'tu negocio', trade: null }

function safeRuntime(): AiRuntime | null {
  try {
    return aiRuntime()
  } catch (error) {
    logger.error('AI runtime config invalid', error)
    return null
  }
}

/** Orden: límite de peticiones, 401/403, 402 de solo lectura, disponibilidad. Gastar créditos es una escritura. */
export async function aiRouteContext(request: NextRequest, roles?: readonly MemberRole[]): Promise<AiRouteResult> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return { ok: false, response: applyRateLimit(limited) }
  const auth = await requireWritableMember(roles)
  if (!auth.ok) return { ok: false, response: auth.response }
  const runtime = safeRuntime()
  if (!runtime || !(await runtime.health.isAvailable())) return { ok: false, response: aiErrorResponse(new AiError('unavailable')) }

  const { data } = await auth.ctx.supabase.from('organizations').select('name, trade').eq('id', auth.ctx.organizationId).single()
  const org = orgSchema.safeParse(data)
  return { ok: true, member: auth.ctx, org: org.success ? org.data : FALLBACK_ORG, runtime }
}

export function aiRunContext(member: MemberContext, request: NextRequest, abort?: AbortController): AiRunContext {
  const signal = abort ? AbortSignal.any([request.signal, abort.signal]) : request.signal
  return { db: member.supabase, organizationId: member.organizationId, signal }
}
