import { brandPalette } from './color'
import type { OrgBranding } from './types'

export function safeLogoUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

/** Branding a partir de organizations.settings (jsonb sin tipar): valores inválidos caen a los de CotizaPro. */
export function orgBranding(name: string | null | undefined, settings: unknown): OrgBranding {
  const s = settings && typeof settings === 'object' ? (settings as Record<string, unknown>) : {}
  return {
    name: name?.trim() || 'Mi empresa',
    logoUrl: safeLogoUrl(s.logo_url),
    palette: brandPalette(s.brand_color),
  }
}
