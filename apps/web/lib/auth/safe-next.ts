/** Ruta interna para volver después de iniciar sesión; null si podría sacar al usuario a otro sitio. */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 512) return null
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}
