const MX_LOCAL_DIGITS = 10
const MX_COUNTRY_CODE = '52'

/** Deja solo dígitos y antepone 52 a un número local mexicano de 10 dígitos. */
export function normalizeWhatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length === MX_LOCAL_DIGITS ? `${MX_COUNTRY_CODE}${digits}` : digits
}

/** Liga wa.me que abre WhatsApp con el mensaje escrito; null si no hay número usable. */
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const normalized = normalizeWhatsappPhone(phone ?? '')
  if (normalized.length < MX_LOCAL_DIGITS) return null
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
}

export interface QuoteMessageInput {
  readonly clientName: string
  readonly businessName: string | null
  readonly quoteNumber: string
  readonly total: number
  readonly validUntil: string | null
  /** Liga pública /c/... para ver y aceptar; null si no se generó. */
  readonly shareUrl: string | null
}

const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 })
const day = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function quoteWhatsappMessage(input: QuoteMessageInput): string {
  const firstName = input.clientName.trim().split(/\s+/)[0] ?? ''
  const from = input.businessName ? ` de ${input.businessName}` : ''
  const lines = [
    `Hola ${firstName}, te comparto la cotización ${input.quoteNumber}${from}.`,
    `Total: ${money.format(Number(input.total))}`,
    input.validUntil ? `Vigente hasta el ${day.format(new Date(input.validUntil))}.` : null,
    input.shareUrl ? `Revísala y acéptala aquí: ${input.shareUrl}` : 'En seguida te mando el PDF por aquí.',
  ]
  return lines.filter((line): line is string => line !== null).join('\n')
}

/** Mensaje del botón "Tengo dudas" de la página pública (lo escribe el cliente al negocio). */
export function quoteQuestionMessage(quoteNumber: string, clientFirstName: string | null): string {
  const who = clientFirstName ? `, soy ${clientFirstName}` : ''
  return `Hola${who}. Tengo dudas sobre la cotización ${quoteNumber}.`
}
