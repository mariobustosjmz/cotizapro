import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { handleApiError, ApiErrors } from '@/lib/error-handler'

export async function GET() {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/notifications')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/notifications')
    }

    const orgId = profile.organization_id
    const today = new Date().toISOString().split('T')[0]

    // Fetch overdue/due reminders and recent quote notifications in parallel
    const [remindersResult, notificationsResult] = await Promise.all([
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
        .select('id, quote_id, notification_type, recipient, status, sent_at, quotes(quote_number)')
        .eq('quotes.organization_id', orgId)
        .order('sent_at', { ascending: false })
        .limit(10),
    ])

    const reminders = (remindersResult.data ?? []).map(r => ({
      id: r.id,
      type: 'reminder' as const,
      title: r.title,
      subtitle: (r.clients as { name?: string } | null)?.name ?? '',
      date: r.scheduled_date,
      priority: r.priority,
      read: false,
      href: `/dashboard/reminders/${r.id}`,
    }))

    const sends = (notificationsResult.data ?? []).map(n => ({
      id: n.id,
      type: 'send' as const,
      title: `${n.notification_type === 'email' ? 'Email' : 'WhatsApp'} ${n.status === 'sent' ? 'enviado' : n.status === 'failed' ? 'fallido' : n.status}`,
      subtitle: (n.quotes as { quote_number?: string } | null)?.quote_number ?? '',
      date: n.sent_at,
      priority: n.status === 'failed' ? 'high' : 'normal',
      read: true,
      href: n.quote_id ? `/dashboard/quotes/${n.quote_id}` : '#',
    }))

    const items = [...reminders, ...sends]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15)

    const unreadCount = reminders.length

    return NextResponse.json({ data: items, unread_count: unreadCount })
  } catch {
    return handleApiError(ApiErrors.INTERNAL_ERROR('Unexpected error'), 'GET /api/notifications')
  }
}
