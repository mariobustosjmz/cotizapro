import { z } from 'zod'
import type { MemberContext } from '@/lib/auth/require-member'
import { logger } from '@/lib/logger'
import { daysSinceSent, FOLLOW_UP_STATUSES, followUpCutoff } from './eligibility'
import { clientNameOf, clientNameSchema } from './load-facts'

export interface PendingFollowUp {
  readonly id: string
  readonly quoteNumber: string
  readonly clientName: string | null
  readonly days: number
}

const PENDING_LIMIT = 5
const rowSchema = z.object({ id: z.guid(), quote_number: z.string(), sent_at: z.string(), clients: clientNameSchema })

export function toPendingFollowUp(row: unknown, now: Date): PendingFollowUp | null {
  const parsed = rowSchema.safeParse(row)
  if (!parsed.success) return null
  return { id: parsed.data.id, quoteNumber: parsed.data.quote_number, clientName: clientNameOf(parsed.data.clients), days: daysSinceSent(parsed.data.sent_at, now) ?? 0 }
}

/** Una sola consulta con el cliente embebido (sin N+1), las 5 enviadas hace más tiempo. */
export async function getPendingFollowUps(db: MemberContext['supabase'], organizationId: string, now: Date): Promise<readonly PendingFollowUp[]> {
  const { data, error } = await db
    .from('quotes')
    .select('id, quote_number, sent_at, clients(name)')
    .eq('organization_id', organizationId)
    .in('status', [...FOLLOW_UP_STATUSES])
    .lt('sent_at', followUpCutoff(now))
    .order('sent_at', { ascending: true })
    .limit(PENDING_LIMIT)
  if (error) {
    logger.error('Pending follow-ups query failed', undefined, { code: error.code })
    return []
  }
  return (data ?? []).map((row: unknown) => toPendingFollowUp(row, now)).filter((r): r is PendingFollowUp => r !== null)
}
