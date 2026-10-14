import type { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { isPublicQuoteToken, publicQuoteUrl } from '@/lib/public-quote/token'

export type ServerClient = Awaited<ReturnType<typeof createServerClient>>

export type ShareLinkResult =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly status: number; readonly error: string }

const SHARE_ERRORS: Readonly<Record<string, { readonly status: number; readonly error: string }>> = {
  quote_not_found: { status: 404, error: 'Cotización no encontrada' },
  forbidden: { status: 403, error: 'Tu rol no permite compartir cotizaciones' },
}

const FAILED: ShareLinkResult = { ok: false, status: 500, error: 'No se pudo generar la liga de la cotización' }

/** Crea la liga pública y revoca la anterior. El token solo existe en esta respuesta; la base guarda su hash. */
export async function createQuoteShareLink(supabase: ServerClient, quoteId: string, fallbackOrigin: string): Promise<ShareLinkResult> {
  const { data, error } = await supabase.rpc('create_quote_share', { p_quote_id: quoteId })
  if (error) {
    const known = SHARE_ERRORS[error.message]
    if (known) return { ok: false, ...known }
    logger.error('create_quote_share failed', error, { quoteId })
    return FAILED
  }
  if (!isPublicQuoteToken(data)) {
    logger.error('create_quote_share returned an invalid token', undefined, { quoteId })
    return FAILED
  }
  return { ok: true, url: publicQuoteUrl(data, fallbackOrigin) }
}
