import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isPublicQuoteToken } from '@/lib/public-quote/token'
import { isLinkPreviewAgent } from '@/lib/public-quote/user-agent'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

interface RouteContext {
  readonly params: Promise<{ token: string }>
}

/** Público: el navegador del cliente avisa que abrió la liga (sent → viewed). Las vistas previas no cuentan. */
export async function POST(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const { token } = await params
  if (!isPublicQuoteToken(token)) return NextResponse.json({ error: 'Liga inválida' }, { status: 400 })
  if (isLinkPreviewAgent(request.headers.get('user-agent'))) return new NextResponse(null, { status: 204 })

  const supabase = await createServerClient()
  const { error } = await supabase.rpc('mark_public_quote_viewed', { p_token: token })
  if (error) {
    logger.error('mark_public_quote_viewed failed', error)
    return NextResponse.json({ error: 'No se pudo registrar la vista' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
