import { whatsappLink } from '@/lib/whatsapp/link'

export type SendChannel = 'email' | 'whatsapp'

export interface RecipientSource {
  readonly client: {
    readonly email: string | null
    readonly phone: string | null
    readonly whatsapp_phone: string | null
  }
}

export interface Recipients {
  readonly email: string | null
  readonly whatsapp: string | null
}

export type RecipientsResult = { readonly ok: true; readonly value: Recipients } | { readonly ok: false; readonly error: string }

/** Se valida a quién se envía antes de crear la liga: crearla revoca la liga anterior. */
export function resolveRecipients(
  sendVia: readonly SendChannel[],
  quote: RecipientSource,
  overrides: { readonly email?: string; readonly whatsapp?: string },
): RecipientsResult {
  const email = sendVia.includes('email') ? overrides.email || quote.client.email || null : null
  if (sendVia.includes('email') && !email) return { ok: false, error: 'El cliente no tiene email y no se proporcionó uno alternativo' }
  const whatsapp = sendVia.includes('whatsapp') ? overrides.whatsapp || quote.client.whatsapp_phone || quote.client.phone || null : null
  if (sendVia.includes('whatsapp') && !whatsappLink(whatsapp, '')) {
    return { ok: false, error: 'El cliente no tiene un WhatsApp válido y no se proporcionó uno alternativo' }
  }
  return { ok: true, value: { email, whatsapp } }
}
