const MX_LOCAL_DIGITS = 10
const MX_COUNTRY_CODE = '52'

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function normalizeWhatsappPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length === MX_LOCAL_DIGITS ? `${MX_COUNTRY_CODE}${digits}` : digits
}

export function whatsappUrl(phone: string, name: string): string {
  const firstName = name.trim().split(/\s+/)[0] ?? ''
  const text = `Hola ${firstName}, recibimos tu solicitud de cotización. ¿Te parece si platicamos los detalles?`
  return `https://wa.me/${normalizeWhatsappPhone(phone)}?text=${encodeURIComponent(text)}`
}

export function formatRequestDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function detailLabel(key: string, labels: Readonly<Record<string, string>>): string {
  return labels[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
}
