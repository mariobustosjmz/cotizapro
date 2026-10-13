import { encode as escapeHtml } from 'html-entities'
import { formatAmount } from '@/lib/format/money'
import type { BrandPalette } from '@/lib/branding/types'

export interface QuoteEmailInput {
  readonly businessName: string
  readonly logoUrl: string | null
  readonly palette: BrandPalette
  readonly clientName: string
  readonly quoteNumber: string
  readonly total: number | string
  readonly validUntil: string | null
  readonly contact: {
    readonly phone: string | null
    readonly email: string | null
    readonly address: string | null
  }
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

function contactLines(contact: QuoteEmailInput['contact']): readonly string[] {
  return [contact.phone && `Tel. ${contact.phone}`, contact.email, contact.address].filter((v): v is string => Boolean(v?.trim()))
}

function header(input: QuoteEmailInput): string {
  const name = escapeHtml(input.businessName)
  const logo = input.logoUrl
    ? `<img src="${escapeHtml(input.logoUrl)}" alt="${name}" height="48" style="display:block;max-height:48px;max-width:200px;margin:0 auto 8px;background:#ffffff;border-radius:6px;padding:4px">`
    : ''
  return `<tr><td style="background:${input.palette.color};color:${input.palette.ink};padding:24px;text-align:center">${logo}<div style="font-size:20px;font-weight:bold">${name}</div></td></tr>`
}

export function buildQuoteEmail(input: QuoteEmailInput): EmailContent {
  const total = `$${formatAmount(input.total)} MXN`
  const validUntil = formatDate(input.validUntil)
  const contact = contactLines(input.contact)
  const subject = `Cotización ${input.quoteNumber} de ${input.businessName}`

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
${header(input)}
<tr><td style="padding:24px">
<p style="margin:0 0 12px;font-size:16px">Hola ${escapeHtml(input.clientName)},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Te compartimos la cotización <strong>${escapeHtml(input.quoteNumber)}</strong>. Va adjunta en PDF con el detalle de cada concepto.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px">
<tr><td style="padding:12px 16px;font-size:14px;color:#6b7280">Total</td><td style="padding:12px 16px;font-size:18px;font-weight:bold;text-align:right;color:${input.palette.onLight}">${escapeHtml(total)}</td></tr>
${validUntil ? `<tr><td style="padding:0 16px 12px;font-size:14px;color:#6b7280">Válida hasta</td><td style="padding:0 16px 12px;font-size:14px;text-align:right">${escapeHtml(validUntil)}</td></tr>` : ''}
</table>
<p style="margin:16px 0 0;font-size:15px;line-height:1.5">Si tienes dudas o quieres aprobarla, responde a este correo y con gusto te atendemos.</p>
${contact.length ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#4b5563">${contact.map((line) => escapeHtml(line)).join('<br>')}</p>` : ''}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af;text-align:center">Enviado por ${escapeHtml(input.businessName)} con CotizaPro</td></tr>
</table></td></tr></table></body></html>`

  const text = [
    `Hola ${input.clientName},`,
    '',
    `Te compartimos la cotización ${input.quoteNumber} de ${input.businessName}. Va adjunta en PDF.`,
    `Total: ${total}`,
    ...(validUntil ? [`Válida hasta: ${validUntil}`] : []),
    '',
    'Si tienes dudas o quieres aprobarla, responde a este correo.',
    ...(contact.length ? ['', ...contact] : []),
  ].join('\n')

  return { subject, html, text }
}
