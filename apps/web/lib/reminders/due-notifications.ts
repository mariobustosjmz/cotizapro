import type { SupabaseClient } from '@supabase/supabase-js'
import { orgBranding } from '@/lib/branding/org-branding'
import { buildReminderEmail } from '@/lib/email/reminder-email'
import { isClientNotifiable } from './client-notice'
import { safeReplyTo } from '@/lib/email/sender'
import { sendEmail } from '@/lib/integrations/email'
import { sendWhatsAppMessage } from '@/lib/integrations/twilio'
import { logger } from '@/lib/logger'
import type { DueNotificationSummary, DueReminderRow } from './types'

const TIME_ZONE = 'America/Monterrey'
/** Igual al LIMIT de client_reminders_due (migración 042, parte C). */
const DUE_REMINDERS_LIMIT = 500

/** Fecha local (Monterrey) de mañana: se avisa lo que vence hoy o mañana. */
export function dueDateLimit(now: Date): string {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow)
}

function settingText(settings: Record<string, unknown>, key: string): string | null {
  const value = settings[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function channels(value: unknown): readonly string[] | null {
  return Array.isArray(value) ? value.filter((c): c is string => typeof c === 'string') : null
}

function toDueReminder(raw: Record<string, unknown>): DueReminderRow | null {
  const id = text(raw.id)
  const clientName = text(raw.client_name)
  if (!id || !clientName) return null
  return {
    id,
    reminder_type: String(raw.reminder_type ?? ''),
    scheduled_date: String(raw.scheduled_date ?? ''),
    notification_channels: channels(raw.notification_channels),
    client: { name: clientName, email: text(raw.client_email), phone: text(raw.client_phone), whatsapp_phone: text(raw.client_whatsapp_phone) },
    organization: { name: String(raw.organization_name ?? ''), settings: raw.organization_settings ?? {} },
  }
}

/** Convierte las filas planas de `client_reminders_due` al formato que usa `notifyOne`. */
export function parseDueReminders(data: unknown): DueReminderRow[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((raw: unknown) => {
    const row = isRecord(raw) ? toDueReminder(raw) : null
    return row ? [row] : []
  })
}

async function notifyOne(row: DueReminderRow): Promise<boolean> {
  if (!isClientNotifiable(row.reminder_type)) return false
  const settings = isRecord(row.organization.settings) ? row.organization.settings : {}
  const branding = orgBranding(row.organization.name, settings)
  const content = buildReminderEmail({
    ...branding,
    businessName: branding.name,
    clientName: row.client.name,
    reminderType: row.reminder_type,
    scheduledDate: row.scheduled_date,
    contact: { phone: settingText(settings, 'company_phone'), email: safeReplyTo(settings.company_email), address: settingText(settings, 'company_address') },
  })
  const selected = row.notification_channels ?? []
  const emailSent = selected.includes('email') && row.client.email
    ? (await sendEmail({ to: row.client.email, subject: content.subject, html: content.html, text: content.text, fromName: branding.name, replyTo: safeReplyTo(settings.company_email) })).success
    : false
  const phone = row.client.whatsapp_phone || row.client.phone
  const whatsappSent = selected.includes('whatsapp') && phone
    ? (await sendWhatsAppMessage({ to: phone, message: content.text })).success
    : false
  return emailSent || whatsappSent
}

/** Envía los avisos al cliente de recordatorios vencidos. La base valida `cronKey` contra el hash guardado. */
export async function sendDueClientReminders(supabase: SupabaseClient, cronKey: string, now: Date): Promise<DueNotificationSummary> {
  const { data, error } = await supabase.rpc('client_reminders_due', { p_cron_key: cronKey, p_until: dueDateLimit(now) })
  if (error) throw new Error(`due reminders query failed: ${error.message}`)
  if (Array.isArray(data) && data.length >= DUE_REMINDERS_LIMIT) {
    logger.warn('Reminders cron hit the SQL limit; remaining reminders wait for the next run', { limit: DUE_REMINDERS_LIMIT })
  }

  const rows = parseDueReminders(data)
  let sent = 0
  for (const row of rows) {
    const ok = await notifyOne(row).catch((err: unknown) => {
      logger.error('Reminder notification failed', err, { reminderId: row.id })
      return false
    })
    if (!ok) continue
    sent += 1
    const { error: markError } = await supabase.rpc('mark_client_reminder_sent', { p_cron_key: cronKey, p_id: row.id, p_sent_at: now.toISOString() })
    if (markError) logger.error('Reminder mark-sent failed', markError, { reminderId: row.id })
  }
  return { processed: rows.length, sent, failed: rows.length - sent }
}
