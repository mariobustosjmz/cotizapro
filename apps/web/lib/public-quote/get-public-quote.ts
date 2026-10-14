import { createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { isPublicQuoteToken } from './token'
import { publicQuoteSchema, type PublicQuote } from './types'

/** Lee la cotización por RPC anónima (sin service role). Liga vencida, revocada o mal formada: null. */
export async function getPublicQuote(token: string): Promise<PublicQuote | null> {
  if (!isPublicQuoteToken(token)) return null
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('get_public_quote', { p_token: token })
  if (error) {
    logger.error('get_public_quote failed', error)
    return null
  }
  if (data === null) return null
  const parsed = publicQuoteSchema.safeParse(data)
  if (!parsed.success) {
    logger.warn('get_public_quote returned an unexpected shape', { issues: parsed.error.issues.length })
    return null
  }
  return parsed.data
}
