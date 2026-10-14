import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { quoteNotificationItem, type QuoteNotificationRow } from '@/lib/notifications/quote-notification-item'
import { mergeBellItems } from '@/lib/notifications/merge-bell-items'
import type { BellItem } from '@/lib/notifications/types'

interface ReminderRow {
  readonly id: string
  readonly title: string
  readonly scheduled_date: string
  readonly priority: string
  readonly clients: { readonly name?: string } | null
}

const MAX_BELL_ITEMS = 15
const CLIENT_RESPONSE_TYPES = ['client_accepted', 'client_rejected']
const NOTIFICATION_COLUMNS = 'id, quote_id, notification_type, recipient, status, sent_at, quotes!inner(quote_number)'

function reminderItem(r: ReminderRow): BellItem {
  return {
    id: r.id, type: 'reminder', kind: 'reminder', title: r.title, subtitle: r.clients?.name ?? '', date: r.scheduled_date,
    priority: r.priority, read: false, href: `/dashboard/reminders/${r.id}`,
  }
}

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/notifications')

    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
    if (!profile) return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/notifications')

    const orgId = profile.organization_id
    const today = new Date().toISOString().split('T')[0]
    const [remindersResult, sendsResult, unreadResult, recentResult, unreadCountResult] = await Promise.all([
      supabase
        .from('follow_up_reminders')
        .select('id, title, scheduled_date, priority, status, client_id, clients(name)')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .lte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(20),
      supabase
        .from('quote_notifications')
        .select(NOTIFICATION_COLUMNS)
        .eq('quotes.organization_id', orgId)
        .in('notification_type', ['email', 'whatsapp'])
        .order('sent_at', { ascending: false })
        .limit(10),
      supabase
        .from('quote_notifications')
        .select(NOTIFICATION_COLUMNS)
        .eq('quotes.organization_id', orgId)
        .in('notification_type', CLIENT_RESPONSE_TYPES)
        .neq('status', 'read')
        .order('sent_at', { ascending: false })
        .limit(10),
      supabase
        .from('quote_notifications')
        .select(NOTIFICATION_COLUMNS)
        .eq('quotes.organization_id', orgId)
        .in('notification_type', CLIENT_RESPONSE_TYPES)
        .order('sent_at', { ascending: false })
        .limit(10),
      supabase
        .from('quote_notifications')
        .select('id, quotes!inner(organization_id)', { count: 'exact', head: true })
        .eq('quotes.organization_id', orgId)
        .in('notification_type', CLIENT_RESPONSE_TYPES)
        .neq('status', 'read'),
    ])

    const reminders = (remindersResult.data ?? []).map((r) => reminderItem(r as unknown as ReminderRow))
    const toItem = (n: unknown): BellItem => quoteNotificationItem(n as QuoteNotificationRow)
    const unreadResponses = (unreadResult.data ?? []).map(toItem)
    const others = [...reminders, ...(sendsResult.data ?? []).map(toItem), ...(recentResult.data ?? []).map(toItem)]
    const items = mergeBellItems(unreadResponses, others, MAX_BELL_ITEMS)
    const unreadCount = reminders.length + (unreadCountResult.count ?? 0)

    return NextResponse.json({ data: items, unread_count: unreadCount })
  } catch {
    return handleApiError(ApiErrors.INTERNAL_ERROR('Unexpected error'), 'GET /api/notifications')
  }
}
