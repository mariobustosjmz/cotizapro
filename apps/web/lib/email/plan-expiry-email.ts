import { encode as escapeHtml } from 'html-entities'
import { formatExpiryDate } from '@/lib/billing/expiry'
import { daysLabel } from '@/lib/billing/expiry-copy'
import type { BillingNoticeKind } from '@/lib/billing/types'
import type { EmailContent } from './quote-email'

export interface PlanExpiryEmailInput {
  readonly businessName: string
  readonly ownerName: string | null
  readonly planName: string
  readonly kind: BillingNoticeKind
  readonly daysLeft: number
  readonly periodEnd: string
  readonly renewUrl: string
}

const BRAND_COLOR = '#EA580C'

function subjectFor(input: PlanExpiryEmailInput): string {
  return input.kind === 'd0'
    ? `Tu plan ${input.planName} de CotizaPro venció`
    : `Tu plan ${input.planName} de CotizaPro vence en ${daysLabel(input.daysLeft)}`
}

function bodyLines(input: PlanExpiryEmailInput): readonly string[] {
  const date = formatExpiryDate(input.periodEnd)
  const status = input.kind === 'd0'
    ? `El plan ${input.planName} de ${input.businessName} venció el ${date}. La cuenta quedó en solo lectura: puedes ver y descargar todo, pero no crear, editar ni enviar cotizaciones hasta renovar.`
    : `El plan ${input.planName} de ${input.businessName} vence el ${date} (en ${daysLabel(input.daysLeft)}). Al vencer, la cuenta queda en solo lectura: podrás ver y descargar todo, pero no crear, editar ni enviar cotizaciones hasta renovar.`
  return [
    status,
    'Si tu suscripción de Mercado Pago sigue activa, el cobro se hace solo y renovamos tu plan en cuanto lo confirmamos.',
    'Tus datos no se borran.',
  ]
}

function htmlFor(greeting: string, lines: readonly string[], renewUrl: string): string {
  const paragraphs = lines.map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5">${escapeHtml(line)}</p>`).join('\n')
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:${BRAND_COLOR};color:#ffffff;padding:20px 24px;font-size:18px;font-weight:bold">CotizaPro</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 12px;font-size:16px">${escapeHtml(greeting)}</p>
${paragraphs}
<p style="margin:20px 0 0"><a href="${escapeHtml(renewUrl)}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">Renovar plan</a></p>
</td></tr></table></td></tr></table></body></html>`
}

export function buildPlanExpiryEmail(input: PlanExpiryEmailInput): EmailContent {
  const firstName = input.ownerName?.trim().split(/\s+/)[0]
  const greeting = firstName ? `Hola ${firstName},` : 'Hola,'
  const lines = bodyLines(input)
  const text = [greeting, '', ...lines, '', `Renovar plan: ${input.renewUrl}`].join('\n')
  return { subject: subjectFor(input), html: htmlFor(greeting, lines, input.renewUrl), text }
}
