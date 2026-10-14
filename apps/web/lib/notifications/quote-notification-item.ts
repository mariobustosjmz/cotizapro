import type { BellItem } from './types'

export interface QuoteNotificationRow {
  readonly id: string
  readonly quote_id: string | null
  readonly notification_type: string
  readonly recipient: string
  readonly status: string
  readonly sent_at: string
  readonly quotes: { readonly quote_number?: string } | null
}

const CLIENT_RESPONSE_TITLES: Readonly<Record<string, string>> = {
  client_accepted: 'Tu cliente aceptó la cotización',
  client_rejected: 'Tu cliente rechazó la cotización',
}

function sendTitle(row: QuoteNotificationRow): string {
  const channel = row.notification_type === 'email' ? 'Email' : 'WhatsApp'
  const state = row.status === 'sent' ? 'enviado' : row.status === 'failed' ? 'fallido' : row.status
  return `${channel} ${state}`
}

export function quoteNotificationItem(row: QuoteNotificationRow): BellItem {
  const quoteNumber = row.quotes?.quote_number ?? ''
  const base = { id: row.id, type: 'send' as const, date: row.sent_at, href: row.quote_id ? `/dashboard/quotes/${row.quote_id}` : '#' }
  const clientTitle = CLIENT_RESPONSE_TITLES[row.notification_type]
  if (clientTitle) {
    return {
      ...base,
      kind: 'client_response' as const,
      title: clientTitle,
      subtitle: [quoteNumber, row.recipient].filter(Boolean).join(' · '),
      priority: row.notification_type === 'client_accepted' ? 'high' : 'normal',
      read: row.status === 'read',
    }
  }
  return { ...base, kind: row.notification_type === 'email' ? 'email' : 'whatsapp', title: sendTitle(row), subtitle: quoteNumber, priority: row.status === 'failed' ? 'high' : 'normal', read: true }
}
