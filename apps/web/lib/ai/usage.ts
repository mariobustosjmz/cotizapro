import { z } from 'zod'
import type { MemberContext } from '@/lib/auth/require-member'
import { logger } from '@/lib/logger'
import type { AiUsage } from './client'
import { AiError, fromDbError } from './errors'
import { AI_FEATURES, type AiFeatureId } from './features'

export type AiDb = Pick<MemberContext['supabase'], 'rpc'>

export interface AiReservation {
  readonly eventId: string
  readonly nonce: string
  readonly feature: AiFeatureId
}

export interface AiOutcome {
  readonly ok: boolean
  readonly usage: AiUsage
  readonly latencyMs: number
}

const reservationSchema = z.array(z.object({ event_id: z.guid(), nonce: z.guid() })).length(1)

export const aiUsageSummarySchema = z.object({
  used: z.number().int().nonnegative(),
  allowance: z.number().int().nonnegative(),
  pack_credits: z.number().int().nonnegative(),
  remaining: z.number().int().nonnegative(),
  percent: z.number().int().min(0).max(100),
  resets_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  enforced: z.boolean(),
  by_feature: z.array(z.object({ feature: z.string(), credits: z.number().int(), uses: z.number().int() })),
  packs: z.array(z.object({ credits: z.number().int(), source: z.enum(['pack', 'courtesy']), expires_at: z.string() })),
})

export type AiUsageSummary = z.infer<typeof aiUsageSummarySchema>

export async function reserveCredits(db: AiDb, feature: AiFeatureId): Promise<AiReservation> {
  const { data, error } = await db.rpc('ai_reserve', { p_feature: feature, p_credits: AI_FEATURES[feature].credits })
  if (error) throw fromDbError(error.message)
  const parsed = reservationSchema.safeParse(data)
  const row = parsed.success ? parsed.data[0] : undefined
  if (!row) throw new AiError('unavailable', 'reserve_shape')
  return { eventId: row.event_id, nonce: row.nonce, feature }
}

export async function finishUsage(db: AiDb, reservation: AiReservation, outcome: AiOutcome): Promise<void> {
  try {
    const { error } = await db.rpc('ai_finish', {
      p_event: reservation.eventId,
      p_nonce: reservation.nonce,
      p_ok: outcome.ok,
      p_prompt_tokens: outcome.usage.promptTokens,
      p_completion_tokens: outcome.usage.completionTokens,
      p_latency_ms: Math.round(outcome.latencyMs),
    })
    if (error) logger.warn('ai_finish failed', { feature: reservation.feature, ok: outcome.ok, reason: error.message })
  } catch (caught) {
    logger.warn('ai_finish threw', { feature: reservation.feature, error: caught instanceof Error ? caught.name : 'unknown' })
  }
}

export async function getUsageSummary(db: AiDb): Promise<AiUsageSummary> {
  const { data, error } = await db.rpc('ai_usage_summary')
  if (error) throw fromDbError(error.message)
  const parsed = aiUsageSummarySchema.safeParse(data)
  if (!parsed.success) throw new AiError('unavailable', 'summary_shape')
  return parsed.data
}

export async function claimUsageAlert(db: AiDb, threshold: 80 | 100): Promise<string | null> {
  try {
    const { data, error } = await db.rpc('ai_claim_usage_alert', { p_threshold: threshold })
    if (error) {
      logger.warn('ai_claim_usage_alert failed', { threshold, reason: error.message })
      return null
    }
    return typeof data === 'string' && data.length > 0 ? data : null
  } catch (caught) {
    logger.warn('ai_claim_usage_alert threw', { threshold, error: caught instanceof Error ? caught.name : 'unknown' })
    return null
  }
}
