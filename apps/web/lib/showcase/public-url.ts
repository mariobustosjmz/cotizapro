import QRCode from 'qrcode'

export function publicProfileUrl(slug: string, fallbackOrigin?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? fallbackOrigin ?? 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/p/${slug}`
}

/** PNG en data URL; margen y nivel de corrección pensados para impresión en tarjeta. */
export function qrDataUrl(text: string, width = 480): Promise<string> {
  return QRCode.toDataURL(text, { width, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111827', light: '#ffffff' } })
}
