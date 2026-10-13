const FALLBACK_ADDRESS = 'cotizaciones@tokenizate.mariobustos.io'
const EMAIL_PATTERN = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/
const MAX_NAME_LENGTH = 60

/** Dirección del remitente verificado (dominio en Resend), a partir de EMAIL_FROM. */
export function senderAddress(envFrom: string | undefined): string {
  const raw = envFrom?.match(/<([^>]+)>/)?.[1] ?? envFrom ?? ''
  const address = raw.trim()
  return EMAIL_PATTERN.test(address) ? address : FALLBACK_ADDRESS
}

/** Encabezado From con el nombre del negocio; la dirección siempre es la verificada. */
export function fromHeader(businessName: string | null | undefined, envFrom: string | undefined): string {
  const clean = (businessName ?? '').replace(/["<>\r\n\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH).trim()
  const display = clean ? `${clean} vía CotizaPro` : 'CotizaPro'
  return `"${display}" <${senderAddress(envFrom)}>`
}

export function safeReplyTo(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return EMAIL_PATTERN.test(email) && email.length <= 254 ? email : null
}
