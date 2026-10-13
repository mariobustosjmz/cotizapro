import type { SupabaseClient } from '@supabase/supabase-js'
import { orgBranding } from '@/lib/branding/org-branding'
import { buildReminderEmail, type ClientReminderType } from '@/lib/email/reminder-email'
import { safeReplyTo } from '@/lib/email/sender'
import { sendEmail } from '@/lib/integrations/email'
import { sendWhatsAppMessage } from '@/lib/integrations/twilio'
import { logger } from '@/lib/logger'

const CLIENT_NOTIFIABLE_TYPES: readonly ClientReminderType[] = ['maintenance', 'renewal']
const BATCH_LIMIT = 500
const TIME_ZONE = 'America/Monterrey'

export interface DueNotificationSummary {
  readonly processed: number
  readonly sent: number
  readonly failed: number
}

interface DueReminderRow {
  readonly id: string
  readonly reminder_type: string
  readonly scheduled_date: string
  readonly notification_channels: readonly string[] | null
  readonly client: { readonly name: string; readonly email: string | null; readonly phone: string | null; readonly whatsapp_phone: string | null } | null
  readonly organization: { readonly name: string; readonly settings: unknown } | null
}

export function isClientNotifiable(type: string): type is ClientReminderType {
  return (CLIENT_NOTIFIABLE_TYPES as readonly string[]).includes(type)
}

/** Fecha local (Monterrey) de mañana: se avisa lo que vence hoy o mañana. */
export function dueDateLimit(now: Date): string {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow)
}

function settingText(settings: Record<string, unknown>, key: string): string | null {
  const value = settings[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

async function notifyOne(row: DueReminderRow): Promise<boolean> {
  if (!row.client || !isClientNotifiable(row.reminder_type)) return false
  const settings = (row.organization?.settings ?? {}) as Record<string, unknown>
  const branding = orgBranding(row.organization?.name, settings)
  const content = buildReminderEmail({
    ...branding,
    businessName: branding.name,
    clientName: row.client.name,
    reminderType: row.reminder_type,
    scheduledDate: row.scheduled_date,
    contact: { phone: settingText(settings, 'company_phone'), email: safeReplyTo(settings.company_email), address: settingText(settings, 'company_address') },
  })
  const channels = row.notification_channels ?? []
  const emailSent = channels.includes('email') && row.client.email
    ? (await sendEmail({ to: row.client.email, subject: content.subject, html: content.html, text: content.text, fromName: branding.name, replyTo: safeReplyTo(settings.company_email) })).success
    : false
  const phone = row.client.whatsapp_phone || row.client.phone
  const whatsappSent = channels.includes('whatsapp') && phone
    ? (await sendWhatsAppMessage({ to: phone, message: content.text })).success
    : false
  return emailSent || whatsappSent
}

/** Envía los avisos al cliente de recordatorios vencidos. Requiere un cliente con service role. */
export async function sendDueClientReminders(admin: SupabaseClient, now: Date): Promise<DueNotificationSummary> {
  const { data, error } = await admin
    .from('follow_up_reminders')
    .select('id, reminder_type, scheduled_date, notification_channels, client:clients(name, email, phone, whatsapp_phone), organization:organizations(name, settings)')
    .eq('auto_send_notification', true)
    .eq('status', 'pending')
    .is('notification_sent_at', null)
    .in('reminder_type', CLIENT_NOTIFIABLE_TYPES)
    .lte('scheduled_date', dueDateLimit(now))
    .limit(BATCH_LIMIT)
  if (error) throw new Error(`due reminders query failed: ${error.message}`)

  const rows = (data ?? []) as unknown as readonly DueReminderRow[]
  let sent = 0
  for (const row of rows) {
    const ok = await notifyOne(row).catch((err: unknown) => {
      logger.error('Reminder notification failed', err, { reminderId: row.id })
      return false
    })
    if (!ok) continue
    sent += 1
    await admin.from('follow_up_reminders').update({ status: 'sent', notification_sent_at: now.toISOString() }).eq('id', row.id)
  }
  return { processed: rows.length, sent, failed: rows.length - sent }
}
