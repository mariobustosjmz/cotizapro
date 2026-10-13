import { encode as escapeHtml } from 'html-entities'
import type { BrandPalette } from '@/lib/branding/types'

export interface BrandedEmailBrand {
  readonly businessName: string
  readonly logoUrl: string | null
  readonly palette: BrandPalette
}

export interface BusinessContact {
  readonly phone: string | null
  readonly email: string | null
  readonly address: string | null
}

export function contactLines(contact: BusinessContact): readonly string[] {
  return [contact.phone && `Tel. ${contact.phone}`, contact.email, contact.address].filter((v): v is string => Boolean(v?.trim()))
}

export function contactHtml(contact: BusinessContact): string {
  const lines = contactLines(contact)
  return lines.length ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#4b5563">${lines.map((line) => escapeHtml(line)).join('<br>')}</p>` : ''
}

function header(brand: BrandedEmailBrand): string {
  const name = escapeHtml(brand.businessName)
  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${name}" height="48" style="display:block;max-height:48px;max-width:200px;margin:0 auto 8px;background:#ffffff;border-radius:6px;padding:4px">`
    : ''
  return `<tr><td style="background:${brand.palette.color};color:${brand.palette.ink};padding:24px;text-align:center">${logo}<div style="font-size:20px;font-weight:bold">${name}</div></td></tr>`
}

/** Marco común de los correos que salen a nombre del negocio; `bodyHtml` ya debe venir escapado. */
export function brandedEmailHtml(brand: BrandedEmailBrand, bodyHtml: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
${header(brand)}
<tr><td style="padding:24px">${bodyHtml}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af;text-align:center">Enviado por ${escapeHtml(brand.businessName)} con CotizaPro</td></tr>
</table></td></tr></table></body></html>`
}
