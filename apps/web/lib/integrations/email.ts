import { Resend } from 'resend'
import { encode as escapeHtml } from 'html-entities'
import type { QuoteWithItems } from '@/types/database.types'

// Only initialize Resend if we have an API key (not during build)
const apiKey = process.env.RESEND_API_KEY

const resend = apiKey
  ? new Resend(apiKey)
  : ({} as Resend) // Dummy object when key is not available

export type SendEmailParams = {
  to: string
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
  }>
}

export type EmailResult = {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: SendEmailParams): Promise<EmailResult> {
  try {
    // Validate API key is configured
    if (!apiKey) {
      console.error('Email send failed: RESEND_API_KEY environment variable is not set')
      return {
        success: false,
        error: 'Email service not configured. Please set RESEND_API_KEY environment variable.',
      }
    }

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'CotizaPro <noreply@cotizapro.com>',
      to,
      subject,
      html,
      attachments,
    })

    return {
      success: true,
      messageId: result.data?.id,
    }
  } catch (error: any) {
    console.error('Email send error:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export function generateQuoteEmailHTML(quote: QuoteWithItems, pdfUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nueva Cotización</h1>
          </div>
          <div class="content">
            <h2>Hola ${escapeHtml(quote.client.name)},</h2>
            <p>Adjunto encontrarás la cotización <strong>${escapeHtml(quote.quote_number)}</strong> con los servicios solicitados.</p>
            <p><strong>Total:</strong> $${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</p>
            <p><strong>Válida hasta:</strong> ${new Date(quote.valid_until).toLocaleDateString('es-MX')}</p>
            <a href="${pdfUrl}" class="button">Ver Cotización (PDF)</a>
            <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
          </div>
          <div class="footer">
            <p>Este correo fue generado automáticamente por CotizaPro</p>
          </div>
        </div>
      </body>
    </html>
  `
}
