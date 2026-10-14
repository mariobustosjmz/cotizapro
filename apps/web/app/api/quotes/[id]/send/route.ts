import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendQuoteSchema } from '@/lib/validations/cotizapro'
import { generateQuotePDF } from '@/lib/integrations/pdf'
import { sendEmail, type EmailResult } from '@/lib/integrations/email'
import { buildQuoteEmail } from '@/lib/email/quote-email'
import { safeReplyTo } from '@/lib/email/sender'
import { orgBranding } from '@/lib/branding/org-branding'
import { quoteWhatsappMessage, whatsappLink } from '@/lib/whatsapp/link'
import { createQuoteShareLink, type ServerClient } from '@/lib/quotes/share-link'
import { sendOutcome, shouldUpdateStatus, statusAfterSend } from '@/lib/quotes/send-status'
import { resolveRecipients } from '@/lib/quotes/send-recipients'
import { messageLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import type { SendChannel } from '@/lib/quotes/send-recipients'
import type { QuotePdfData } from '@/lib/pdf/quote-pdf-types'

interface SendableQuote extends QuotePdfData {
  readonly id: string
  readonly status: string
  readonly client: QuotePdfData['client'] & { readonly whatsapp_phone: string | null }
}

interface Organization {
  readonly name: string
  readonly settings: unknown
}

interface WhatsappResult {
  readonly success: true
  readonly url: string
}

async function sendQuoteByEmail(
  supabase: ServerClient,
  quote: SendableQuote,
  organization: Organization | null,
  delivery: { readonly to: string; readonly acceptUrl: string; readonly fallbackReplyTo: string | undefined },
): Promise<EmailResult> {
  const settings = (organization?.settings ?? {}) as Record<string, unknown>
  const branding = orgBranding(organization?.name, settings)
  const content = buildQuoteEmail({
    businessName: branding.name,
    logoUrl: branding.logoUrl,
    palette: branding.palette,
    clientName: quote.client.name,
    quoteNumber: quote.quote_number,
    total: quote.total,
    validUntil: quote.valid_until,
    acceptUrl: delivery.acceptUrl,
    contact: {
      phone: typeof settings.company_phone === 'string' ? settings.company_phone : null,
      email: safeReplyTo(settings.company_email),
      address: typeof settings.company_address === 'string' ? settings.company_address : null,
    },
  })
  const pdfBuffer = await generateQuotePDF(quote)
  const result = await sendEmail({
    to: delivery.to,
    subject: content.subject,
    html: content.html,
    text: content.text,
    fromName: branding.name,
    replyTo: safeReplyTo(settings.company_email) ?? safeReplyTo(delivery.fallbackReplyTo),
    attachments: [{ filename: `${quote.quote_number}.pdf`, content: pdfBuffer }],
  })
  await supabase.from('quote_notifications').insert({
    quote_id: quote.id,
    notification_type: 'email',
    recipient: delivery.to,
    status: result.success ? 'sent' : 'failed',
    provider_message_id: result.messageId,
    error_message: result.error,
  })
  if (!result.success) logger.warn('Email sending failed for quote', { quoteId: quote.id, error: result.error })
  return result
}

async function prepareWhatsapp(
  supabase: ServerClient,
  quote: SendableQuote,
  businessName: string | null,
  delivery: { readonly to: string; readonly shareUrl: string },
): Promise<WhatsappResult | null> {
  const url = whatsappLink(delivery.to, quoteWhatsappMessage({
    clientName: quote.client.name,
    businessName,
    quoteNumber: quote.quote_number,
    total: quote.total,
    validUntil: quote.valid_until,
    shareUrl: delivery.shareUrl,
  }))
  if (!url) return null
  await supabase.from('quote_notifications').insert({ quote_id: quote.id, notification_type: 'whatsapp', recipient: delivery.to, status: 'sent' })
  return { success: true, url }
}

async function markQuoteSent(supabase: ServerClient, quote: SendableQuote, sendVia: readonly SendChannel[]): Promise<boolean> {
  if (!shouldUpdateStatus(quote.status)) return false
  const { data, error } = await supabase
    .from('quotes')
    .update({ status: statusAfterSend(quote.status), sent_at: new Date().toISOString(), sent_via: [...sendVia] })
    .eq('id', quote.id)
    .eq('status', quote.status)
    .select('id')
  if (error) {
    logger.error('Failed to mark quote as sent', error, { quoteId: quote.id })
    return false
  }
  if (!data || data.length === 0) {
    logger.warn('Quote status changed concurrently while sending; not updated', { quoteId: quote.id })
    return false
  }
  return true
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limitResult = messageLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for quote sending', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }
    const { id } = await params
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('POST /api/quotes/[id]/send - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'POST /api/quotes/[id]/send')
    }

    const validation = sendQuoteSchema.safeParse({ ...(await request.json()), quote_id: id })
    if (!validation.success) {
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid send quote data: ${validation.error.issues.map(e => `${e.path.join('.')}: ${e.code}`).join(', ')}`),
        'POST /api/quotes/[id]/send - validation'
      )
    }
    const { send_via, email_override, whatsapp_override } = validation.data

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`*, items:quote_items(*), client:clients(*), organization:organizations(name, settings)`)
      .eq('id', id)
      .single()
    if (quoteError || !quote) {
      logger.error('Error fetching quote for sending', quoteError, { quoteId: id })
      return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'POST /api/quotes/[id]/send')
    }

    const recipients = resolveRecipients(send_via, quote, { email: email_override, whatsapp: whatsapp_override })
    if (!recipients.ok) return NextResponse.json({ error: recipients.error }, { status: 400 })

    const share = await createQuoteShareLink(supabase, id, request.nextUrl.origin)
    if (!share.ok) return NextResponse.json({ error: share.error }, { status: share.status })

    const organization = quote.organization as unknown as Organization | null
    const { email: emailTo, whatsapp: whatsappTo } = recipients.value
    const email = emailTo ? await sendQuoteByEmail(supabase, quote, organization, { to: emailTo, acceptUrl: share.url, fallbackReplyTo: user.email }) : null
    const whatsapp = whatsappTo ? await prepareWhatsapp(supabase, quote, organization?.name ?? null, { to: whatsappTo, shareUrl: share.url }) : null

    const outcome = sendOutcome({ emailRequested: emailTo !== null, emailOk: email?.success === true, whatsappRequested: whatsappTo !== null, whatsappOk: whatsapp !== null })
    if (!outcome.markSent) {
      logger.warn('Quote send failed; previous public link was rotated', { quoteId: id })
      return NextResponse.json({ error: `No se pudo enviar el correo: ${email?.error ?? 'error desconocido'}`, share_url: share.url }, { status: outcome.httpStatus })
    }

    const statusUpdated = await markQuoteSent(supabase, quote, send_via)
    logger.api('POST', `/api/quotes/${id}/send`, 200, 0, { quoteId: id, sentVia: send_via })
    return NextResponse.json({ success: true, results: { email, whatsapp }, share_url: share.url, status_updated: statusUpdated })
  } catch (error) {
    logger.error('Unexpected error in POST /api/quotes/[id]/send', error)
    return handleApiError(ApiErrors.INTERNAL_ERROR('Failed to send quote'), 'POST /api/quotes/[id]/send - unhandled exception')
  }
}
