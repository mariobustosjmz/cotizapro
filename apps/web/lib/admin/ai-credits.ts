import type { SupabaseClient } from '@supabase/supabase-js'
import type { z } from 'zod'
import { aiUsageSummarySchema, type AiUsageSummary } from '@/lib/ai/usage'
import { formatResetDate } from '@/lib/ai/period'
import { adminGrantSchema } from '@/lib/validations/ai'

export const adminGrantBodySchema = adminGrantSchema.omit({ organizationId: true }).refine(
  (body) => body.source !== 'pack' || Boolean(body.reference),
  { path: ['reference'], message: 'Escribe la referencia del pago' },
)
export type AdminGrantBody = z.infer<typeof adminGrantBodySchema>

export interface AiGrantError {
  readonly status: 400 | 404 | 409 | 500
  readonly error: string
}

export type AdminAiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly failure: AiGrantError; readonly code?: string }

const GENERIC_ERROR: AiGrantError = { status: 500, error: 'No se pudieron agregar los créditos' }

const RPC_ERRORS: Readonly<Record<string, AiGrantError>> = {
  forbidden: { status: 404, error: 'No encontrado' },
  organization_not_found: { status: 404, error: 'Empresa no encontrada' },
  ai_invalid_credits: { status: 400, error: 'Cantidad de créditos no válida' },
  ai_invalid_source: { status: 400, error: 'Origen no válido' },
  ai_duplicate_reference: { status: 409, error: 'Ese pago ya se acreditó' },
  ai_invalid_reference: { status: 400, error: 'La referencia admite máximo 200 caracteres' },
}

/** Traduce las excepciones de admin_grant_ai_credits y admin_ai_usage (migración 043). */
export function aiGrantError(message: string | undefined): AiGrantError {
  return message && Object.hasOwn(RPC_ERRORS, message) ? RPC_ERRORS[message] : GENERIC_ERROR
}

export async function getAdminAiUsage(db: SupabaseClient, organizationId: string): Promise<AdminAiResult<AiUsageSummary>> {
  const { data, error } = await db.rpc('admin_ai_usage', { p_org: organizationId })
  if (error) return { ok: false, failure: aiGrantError(error.message), code: error.code }
  const parsed = aiUsageSummarySchema.safeParse(data)
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, failure: GENERIC_ERROR }
}

export async function grantAiCredits(
  db: SupabaseClient,
  organizationId: string,
  body: AdminGrantBody,
): Promise<AdminAiResult<{ readonly grantId: string }>> {
  const { data, error } = await db.rpc('admin_grant_ai_credits', {
    p_org: organizationId,
    p_credits: body.credits,
    p_source: body.source,
    p_reference: body.reference ? body.reference : null,
  })
  if (error) return { ok: false, failure: aiGrantError(error.message), code: error.code }
  return typeof data === 'string' ? { ok: true, data: { grantId: data } } : { ok: false, failure: GENERIC_ERROR }
}

/** '2026-11-01' -> '1 de noviembre de 2026'. */
export function formatResetDateLong(isoDate: string): string {
  return `${formatResetDate(isoDate)} de ${isoDate.slice(0, 4)}`
}
