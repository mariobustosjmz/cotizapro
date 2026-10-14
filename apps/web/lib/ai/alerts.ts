import type { EmailResult, SendEmailParams } from '@/lib/integrations/email'
import { logger } from '@/lib/logger'
import { formatResetDate } from './period'
import { claimUsageAlert, type AiDb, type AiUsageSummary } from './usage'

export type AlertThreshold = 80 | 100
export type SendEmail = (params: SendEmailParams) => Promise<EmailResult>

export function crossedThreshold(percent: number): AlertThreshold | null {
  if (percent >= 100) return 100
  if (percent >= 80) return 80
  return null
}

const HTML_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

export function usageAlertEmail(threshold: AlertThreshold, summary: AiUsageSummary, appUrl: string): Omit<SendEmailParams, 'to'> {
  const resets = formatResetDate(summary.resets_on)
  const total = summary.allowance + summary.pack_credits
  const link = `${appUrl}/dashboard/billing#ia`
  const subject = threshold === 100 ? 'Se acabaron tus créditos de IA de este mes' : 'Usaste el 80 % de tus créditos de IA'
  const lead =
    threshold === 100
      ? `Tu empresa usó todos sus créditos de IA. Se reinician el ${resets}.`
      : `Tu empresa lleva ${summary.used} de ${total} créditos de IA este mes. Se reinician el ${resets}.`
  return {
    subject,
    text: `${lead}\n\nSi necesitas más, puedes obtener un paquete de créditos aquí: ${link}\n\nCotizar y enviar cotizaciones no dependen de la IA.`,
    html: `<p>${escapeHtml(lead)}</p><p>Si necesitas más, puedes obtener un paquete de créditos: <a href="${escapeHtml(link)}">Obtener más</a>.</p><p>Cotizar y enviar cotizaciones no dependen de la IA.</p>`,
  }
}

export async function notifyUsageThreshold(db: AiDb, summary: AiUsageSummary, send: SendEmail, appUrl: string): Promise<void> {
  const threshold = crossedThreshold(summary.percent)
  if (!threshold) return
  const to = await claimUsageAlert(db, threshold)
  if (!to) return
  try {
    const result = await send({ to, ...usageAlertEmail(threshold, summary, appUrl) })
    if (!result.success) logger.warn('ai usage alert email failed', { threshold })
  } catch {
    logger.warn('ai usage alert email failed', { threshold })
  }
}
