import { z } from 'zod'
import type { MemberContext } from '@/lib/auth/require-member'
import { logger } from '@/lib/logger'

export interface ReviewsForReplyResult {
  readonly reviews: readonly ReviewForReply[]
  readonly failed: boolean
}

export interface ReviewForReply {
  readonly id: string
  readonly rating: number
  readonly comment: string | null
  readonly ownerReply: string | null
  readonly isVisible: boolean
  readonly submittedAt: string
  readonly clientName: string | null
}

const REVIEWS_LIMIT = 20

const clientSchema = z.object({ name: z.string() })
const rowSchema = z.object({
  id: z.guid(),
  rating: z.number().int(),
  comment: z.string().nullable(),
  owner_reply: z.string().nullable(),
  is_visible: z.boolean(),
  submitted_at: z.string(),
  clients: z.union([clientSchema, z.array(clientSchema)]).nullable(),
})

export function toReviewForReply(row: unknown): ReviewForReply | null {
  const parsed = rowSchema.safeParse(row)
  if (!parsed.success) return null
  const { clients } = parsed.data
  const client = Array.isArray(clients) ? (clients[0] ?? null) : clients
  return {
    id: parsed.data.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    ownerReply: parsed.data.owner_reply,
    isVisible: parsed.data.is_visible,
    submittedAt: parsed.data.submitted_at,
    clientName: client?.name ?? null,
  }
}

export async function getReviewsForReply(db: MemberContext['supabase'], organizationId: string): Promise<ReviewsForReplyResult> {
  const { data, error } = await db
    .from('reviews')
    .select('id, rating, comment, owner_reply, is_visible, submitted_at, clients(name)')
    .eq('organization_id', organizationId)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(REVIEWS_LIMIT)
  if (error) {
    logger.error('reviews for reply query failed', undefined, { organizationId, code: error.code })
    return { reviews: [], failed: true }
  }
  const reviews = (data ?? []).map(toReviewForReply).filter((review): review is ReviewForReply => review !== null)
  return { reviews, failed: false }
}
