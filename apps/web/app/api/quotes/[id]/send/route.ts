import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendQuoteSchema } from '@/lib/validations/cotizapro'
import { generateQuotePDF } from '@/lib/integrations/pdf'
import { sendEmail, type EmailResult } from '@/lib/integrations/email'
import { buildQuoteEmail } from '@/lib/email/quote-email'
import { safeReplyTo } from '@/lib/email/sender'
import { orgBranding } from '@/lib/branding/org-branding'
import { quoteWhatsappMessage, whatsappLink } from '@/lib/whatsapp/link'
import { messageLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting (strict for message sending)
    const limitResult = messageLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for quote sending', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('POST /api/quotes/[id]/send - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'POST /api/quotes/[id]/send')
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = sendQuoteSchema.safeParse({ ...body, quote_id: id })

    if (!validation.success) {
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid send quote data: ${validation.error.issues.map(e => `${e.path.join('.')}: ${e.code}`).join(', ')}`),
        'POST /api/quotes/[id]/send - validation'
      )
    }

    const { send_via, email_override, whatsapp_override } = validation.data

    // Fetch quote with all details
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        items:quote_items(*),
        client:clients(*),
        organization:organizations(name, settings)
      `)
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      logger.error('Error fetching quote for sending', quoteError, { quoteId: id })
      return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'POST /api/quotes/[id]/send')
    }

    // Generate PDF
    logger.info('Generating PDF for quote', { quoteNumber: quote.quote_number })
    const pdfBuffer = await generateQuotePDF(quote)

    // Upload PDF to Supabase Storage
    const pdfFileName = `quotes/${quote.organization_id}/${quote.quote_number}.pdf`
    logger.database('UPLOAD', 'storage/documents', { fileName: pdfFileName })

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      })

    let publicUrl = ''
    if (uploadError) {
      logger.warn('Error uploading PDF to storage — continuing without PDF URL', { error: uploadError?.message, fileName: pdfFileName })
    } else {
      const { data: { publicUrl: url } } = supabase.storage
        .from('documents')
        .getPublicUrl(pdfFileName)
      publicUrl = url
      logger.info('PDF generated and uploaded successfully', { quoteNumber: quote.quote_number, pdfUrl: publicUrl })
    }

    const organization = quote.organization as unknown as { name: string; settings: unknown } | null

    const results: {
      email: EmailResult | null
      whatsapp: { success: true; url: string } | null
    } = {
      email: null,
      whatsapp: null,
    }

    // Send via email
    if (send_via.includes('email')) {
      const emailTo = email_override || quote.client.email

      if (!emailTo) {
        return NextResponse.json({
          error: 'El cliente no tiene email y no se proporcionó uno alternativo'
        }, { status: 400 })
      }

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
        contact: {
          phone: typeof settings.company_phone === 'string' ? settings.company_phone : null,
          email: safeReplyTo(settings.company_email),
          address: typeof settings.company_address === 'string' ? settings.company_address : null,
        },
      })

      logger.info('Sending quote via email', { quoteId: id })
      const emailResult = await sendEmail({
        to: emailTo,
        subject: content.subject,
        html: content.html,
        text: content.text,
        fromName: branding.name,
        replyTo: safeReplyTo(settings.company_email) ?? safeReplyTo(user.email),
        attachments: [{
          filename: `${quote.quote_number}.pdf`,
          content: pdfBuffer,
        }],
      })

      results.email = emailResult

      // Log notification
      await supabase.from('quote_notifications').insert({
        quote_id: id,
        notification_type: 'email',
        recipient: emailTo,
        status: emailResult.success ? 'sent' : 'failed',
        provider_message_id: emailResult.messageId,
        error_message: emailResult.error,
      })

      if (!emailResult.success) {
        logger.warn('Email sending failed for quote', { quoteId: id, error: emailResult.error })
        if (!send_via.includes('whatsapp')) {
          return NextResponse.json({ error: `No se pudo enviar el correo: ${emailResult.error ?? 'error desconocido'}` }, { status: 502 })
        }
      }
    }

    // WhatsApp por liga wa.me: el envío lo hace el usuario desde su propio WhatsApp.
    if (send_via.includes('whatsapp')) {
      const whatsappTo = whatsapp_override || quote.client.whatsapp_phone || quote.client.phone
      const url = whatsappLink(whatsappTo, quoteWhatsappMessage({
        clientName: quote.client.name,
        businessName: organization?.name ?? null,
        quoteNumber: quote.quote_number,
        total: quote.total,
        validUntil: quote.valid_until,
        pdfUrl: publicUrl || null,
      }))

      if (!url) {
        return NextResponse.json({
          error: 'El cliente no tiene un WhatsApp válido y no se proporcionó uno alternativo'
        }, { status: 400 })
      }

      results.whatsapp = { success: true, url }

      await supabase.from('quote_notifications').insert({
        quote_id: id,
        notification_type: 'whatsapp',
        recipient: whatsappTo,
        status: 'sent',
      })
    }

    // Update quote status to 'sent'
    logger.info('Updating quote status to sent', { quoteId: id })
    await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_via: send_via,
      })
      .eq('id', id)

    logger.api('POST', `/api/quotes/${id}/send`, 200, 0, { quoteId: id, sentVia: send_via })

    return NextResponse.json({
      success: true,
      results,
      pdf_url: publicUrl,
    })
  } catch (error) {
    logger.error('Unexpected error in POST /api/quotes/[id]/send', error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to send quote'),
      'POST /api/quotes/[id]/send - unhandled exception'
    )
  }
}
