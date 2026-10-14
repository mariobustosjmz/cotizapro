import { z } from 'zod'
import type { MemberContext } from '@/lib/auth/require-member'
import { logger } from '@/lib/logger'
import { AiError } from '../errors'

export interface FollowUpFacts {
  readonly quoteId: string
  readonly quoteNumber: string
  readonly status: string
  readonly sentAt: string | null
  readonly validUntil: string | null
  readonly clientName: string | null
  readonly itemSummaries: readonly string[]
}

const named = z.object({ name: z.string() })
export const clientNameSchema = z.union([named, z.array(named)]).nullable().optional()

export function clientNameOf(value: z.infer<typeof clientNameSchema>): string | null {
  const client = Array.isArray(value) ? value[0] : value
  return client?.name ?? null
}

const rowSchema = z.object({
  id: z.guid(),
  quote_number: z.string(),
  status: z.string(),
  sent_at: z.string().nullable(),
  valid_until: z.string().nullable(),
  clients: clientNameSchema,
  quote_items: z.array(z.object({ description: z.string().nullable() })).default([]),
})

const MAX_ITEMS = 3
const MAX_ITEM_CHARS = 80

export function toFollowUpFacts(row: unknown): FollowUpFacts | null {
  const parsed = rowSchema.safeParse(row)
  if (!parsed.success) return null
  const r = parsed.data
  return {
    quoteId: r.id,
    quoteNumber: r.quote_number,
    status: r.status,
    sentAt: r.sent_at,
    validUntil: r.valid_until,
    clientName: clientNameOf(r.clients),
    itemSummaries: r.quote_items
      .map((i) => (i.description ?? '').trim().slice(0, MAX_ITEM_CHARS))
      .filter(Boolean)
      .slice(0, MAX_ITEMS),
  }
}

/** null = no existe o es de otra empresa; un error de base lanza AiError('unavailable'). Solo nombre del cliente y descripciones de partidas: ni correo, ni teléfono, ni montos. */
export async function loadFollowUpFacts(db: MemberContext['supabase'], organizationId: string, quoteId: string): Promise<FollowUpFacts | null> {
  const { data, error } = await db
    .from('quotes')
    .select('id, quote_number, status, sent_at, valid_until, clients(name), quote_items(description)')
    .eq('id', quoteId)
    .eq('organization_id', organizationId)
    .order('sort_order', { referencedTable: 'quote_items', ascending: true })
    .limit(5, { referencedTable: 'quote_items' })
    .maybeSingle()
  if (error) {
    logger.error('Follow-up facts query failed', undefined, { code: error.code })
    throw new AiError('unavailable', 'db_error')
  }
  return data ? toFollowUpFacts(data) : null
}
