import { encode as escapeHtml } from 'html-entities'
import { formatAmount } from '@/lib/format/money'
import { brandedEmailHtml, contactHtml, contactLines, type BrandedEmailBrand, type BusinessContact } from './layout'

export interface QuoteEmailInput extends BrandedEmailBrand {
  readonly clientName: string
  readonly quoteNumber: string
  readonly total: number | string
  readonly validUntil: string | null
  readonly contact: BusinessContact
}

export interface EmailContent {
  readonly subject: string
  readonly html: string
  readonly text: string
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Monterrey' })
}

export function buildQuoteEmail(input: QuoteEmailInput): EmailContent {
  const total = `$${formatAmount(input.total)} MXN`
  const validUntil = formatDate(input.validUntil)
  const subject = `Cotización ${input.quoteNumber} de ${input.businessName}`

  const body = `<p style="margin:0 0 12px;font-size:16px">Hola ${escapeHtml(input.clientName)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Te compartimos la cotización <strong>${escapeHtml(input.quoteNumber)}</strong>. Va adjunta en PDF con el detalle de cada concepto.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px">
<tr><td style="padding:12px 16px;font-size:14px;color:#6b7280">Total</td><td style="padding:12px 16px;font-size:18px;font-weight:bold;text-align:right;color:${input.palette.onLight}">${escapeHtml(total)}</td></tr>
${validUntil ? `<tr><td style="padding:0 16px 12px;font-size:14px;color:#6b7280">Válida hasta</td><td style="padding:0 16px 12px;font-size:14px;text-align:right">${escapeHtml(validUntil)}</td></tr>` : ''}
</table>
<p style="margin:16px 0 0;font-size:15px;line-height:1.5">Si tienes dudas o quieres aprobarla, responde a este correo y con gusto te atendemos.</p>
${contactHtml(input.contact)}`

  const lines = contactLines(input.contact)
  const text = [
    `Hola ${input.clientName},`,
    '',
    `Te compartimos la cotización ${input.quoteNumber} de ${input.businessName}. Va adjunta en PDF.`,
    `Total: ${total}`,
    ...(validUntil ? [`Válida hasta: ${validUntil}`] : []),
    '',
    'Si tienes dudas o quieres aprobarla, responde a este correo.',
    ...(lines.length ? ['', ...lines] : []),
  ].join('\n')

  return { subject, html: brandedEmailHtml(input, body), text }
}
