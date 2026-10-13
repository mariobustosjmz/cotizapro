import { Resend } from 'resend'
import { fromHeader } from '@/lib/email/sender'
import { logger } from '@/lib/logger'

const apiKey = process.env.RESEND_API_KEY
const resend = apiKey ? new Resend(apiKey) : null

export interface SendEmailParams {
  readonly to: string
  readonly subject: string
  readonly html: string
  readonly text?: string
  /** Nombre visible del remitente (el negocio); la dirección siempre es la verificada en Resend. */
  readonly fromName?: string | null
  readonly replyTo?: string | null
  readonly attachments?: ReadonlyArray<{ readonly filename: string; readonly content: Buffer | string }>
}

export interface EmailResult {
  readonly success: boolean
  readonly messageId?: string
  readonly error?: string
}

export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  if (!resend) {
    logger.warn('Email not sent: RESEND_API_KEY is not set')
    return { success: false, error: 'El correo no está configurado en el servidor' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromHeader(params.fromName, process.env.EMAIL_FROM),
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.text && { text: params.text }),
      ...(params.replyTo && { replyTo: params.replyTo }),
      ...(params.attachments && { attachments: params.attachments.map((a) => ({ ...a })) }),
    })
    if (error || !data) {
      logger.warn('Resend rejected email', { reason: error?.name, message: error?.message })
      return { success: false, error: error?.message ?? 'El proveedor de correo rechazó el envío' }
    }
    return { success: true, messageId: data.id }
  } catch (error) {
    logger.error('Email send error', error)
    return { success: false, error: 'No se pudo conectar con el proveedor de correo' }
  }
}
