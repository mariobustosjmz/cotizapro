import { z } from 'zod'
import { PLANS, isPlanId } from '@/lib/plans/catalog'
import { buildPlanExpiryEmail } from '@/lib/email/plan-expiry-email'
import { logger } from '@/lib/logger'
import type { EmailContent } from '@/lib/email/quote-email'
import { daysUntilExpiry, noticeKindFor } from './expiry'
import type { BillingNoticeKind, DueNotice, PaidPlanId } from './types'

const dueRowSchema = z.object({
  organization_id: z.string(),
  organization_name: z.string(),
  plan: z.string(),
  current_period_end: z.string(),
  owner_email: z.string().nullable(),
  owner_name: z.string().nullable(),
  sent_kinds: z.array(z.enum(['d7', 'd3', 'd1', 'd0'])).nullable(),
})

function paidPlanId(plan: string): PaidPlanId | null {
  return isPlanId(plan) && plan !== 'free' ? plan : null
}

/** current_period_end se conserva tal cual: claim/release lo comparan contra la base al microsegundo. */
export function parseDueNotices(data: unknown): DueNotice[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((raw): DueNotice[] => {
    const row = dueRowSchema.safeParse(raw)
    if (!row.success) return []
    const planId = paidPlanId(row.data.plan)
    if (!planId) return []
    return [{
      organizationId: row.data.organization_id,
      organizationName: row.data.organization_name,
      planId,
      periodEnd: row.data.current_period_end,
      ownerEmail: row.data.owner_email,
      ownerName: row.data.owner_name,
      sentKinds: row.data.sent_kinds ?? [],
    }]
  })
}

export interface OutgoingEmail extends EmailContent {
  readonly to: string
}

export interface NoticeDeps {
  readonly now: Date
  readonly renewUrl: string
  readonly claim: (notice: DueNotice, kind: BillingNoticeKind) => Promise<boolean>
  readonly release: (notice: DueNotice, kind: BillingNoticeKind) => Promise<void>
  readonly send: (email: OutgoingEmail) => Promise<boolean>
}

export interface NoticeRunSummary {
  readonly considered: number
  readonly sent: number
  readonly skipped: number
  readonly failed: number
}

type NoticeOutcome = 'sent' | 'skipped' | 'failed'

async function processNotice(notice: DueNotice, deps: NoticeDeps): Promise<NoticeOutcome> {
  const daysLeft = daysUntilExpiry(notice.periodEnd, deps.now)
  const kind = daysLeft === null ? null : noticeKindFor(daysLeft)
  if (daysLeft === null || !kind || !notice.ownerEmail || notice.sentKinds.includes(kind)) return 'skipped'
  if (!(await deps.claim(notice, kind))) return 'skipped'
  const email = buildPlanExpiryEmail({
    businessName: notice.organizationName,
    ownerName: notice.ownerName,
    planName: PLANS[notice.planId].name,
    kind,
    daysLeft,
    periodEnd: notice.periodEnd,
    renewUrl: deps.renewUrl,
  })
  if (await deps.send({ ...email, to: notice.ownerEmail })) return 'sent'
  await deps.release(notice, kind)
  return 'failed'
}

/** Un error inesperado en un aviso no frena a los demás; se cuenta como fallido. */
async function safeProcessNotice(notice: DueNotice, deps: NoticeDeps): Promise<NoticeOutcome> {
  try {
    return await processNotice(notice, deps)
  } catch (error) {
    logger.error('Billing notice failed', error, { organizationId: notice.organizationId })
    return 'failed'
  }
}

/** Secuencial a propósito: pocas cuentas por día y sin ráfagas contra Resend. */
export async function runBillingNotices(notices: readonly DueNotice[], deps: NoticeDeps): Promise<NoticeRunSummary> {
  const outcomes = await notices.reduce<Promise<readonly NoticeOutcome[]>>(
    async (previous, notice) => [...(await previous), await safeProcessNotice(notice, deps)],
    Promise.resolve([]),
  )
  const count = (outcome: NoticeOutcome): number => outcomes.filter((o) => o === outcome).length
  return { considered: notices.length, sent: count('sent'), skipped: count('skipped'), failed: count('failed') }
}
