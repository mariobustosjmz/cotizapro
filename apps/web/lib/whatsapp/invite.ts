import { whatsappLink } from './link'

export interface InviteMessageInput {
  readonly organizationName: string
  readonly roleLabel: string
  readonly inviteUrl: string
}

export function inviteWhatsappMessage(input: InviteMessageInput): string {
  return [
    `Hola, te invito a unirte a ${input.organizationName} en CotizaPro como ${input.roleLabel}.`,
    `Entra aquí para crear tu acceso: ${input.inviteUrl}`,
    'La invitación vence en 7 días.',
  ].join('\n')
}

/** Con teléfono abre ese chat; sin teléfono usable, WhatsApp pide elegir el contacto. */
export function inviteWhatsappLink(phone: string | null | undefined, input: InviteMessageInput): string {
  const text = inviteWhatsappMessage(input)
  return whatsappLink(phone, text) ?? `https://wa.me/?text=${encodeURIComponent(text)}`
}
