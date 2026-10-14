import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/integrations/email'
import { logger } from '@/lib/logger'
import { parseDueNotices, type NoticeDeps } from './notices'
import type { BillingNoticeKind, DueNotice } from './types'

interface NoticeArgs {
  readonly p_cron_key: string
  readonly p_org: string
  readonly p_period_end: string
  readonly p_kind: BillingNoticeKind
}

function noticeArgs(cronKey: string, notice: DueNotice, kind: BillingNoticeKind): NoticeArgs {
  return { p_cron_key: cronKey, p_org: notice.organizationId, p_period_end: notice.periodEnd, p_kind: kind }
}

export async function fetchDueNotices(supabase: SupabaseClient, cronKey: string): Promise<readonly DueNotice[] | null> {
  const { data, error } = await supabase.rpc('billing_notices_due', { p_cron_key: cronKey })
  if (error) {
    logger.error('billing_notices_due failed', error)
    return null
  }
  return parseDueNotices(data)
}

export function rpcNoticeDeps(supabase: SupabaseClient, cronKey: string, now: Date, renewUrl: string): NoticeDeps {
  return {
    now,
    renewUrl,
    claim: async (notice, kind) => {
      const { data, error } = await supabase.rpc('claim_billing_notice', noticeArgs(cronKey, notice, kind))
      if (error) logger.error('claim_billing_notice failed', error, { organizationId: notice.organizationId, kind })
      return !error && data === true
    },
    release: async (notice, kind) => {
      const { error } = await supabase.rpc('release_billing_notice', noticeArgs(cronKey, notice, kind))
      if (error) logger.error('release_billing_notice failed', error, { organizationId: notice.organizationId, kind })
    },
    send: async (email) => {
      const result = await sendEmail({ to: email.to, subject: email.subject, html: email.html, text: email.text, fromName: 'CotizaPro' })
      return result.success
    },
  }
}
