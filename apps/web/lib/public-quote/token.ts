/** 32 bytes aleatorios en hex (migración 041). Se valida antes de llamar a la base. */
export const PUBLIC_QUOTE_TOKEN_PATTERN = /^[a-f0-9]{64}$/

export function isPublicQuoteToken(value: unknown): value is string {
  return typeof value === 'string' && PUBLIC_QUOTE_TOKEN_PATTERN.test(value)
}

export function publicQuoteUrl(token: string, fallbackOrigin?: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin || 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/c/${token}`
}
