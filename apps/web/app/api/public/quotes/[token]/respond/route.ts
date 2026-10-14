import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { hashClientIp } from '@/lib/showcase/request-meta'
import { isPublicQuoteToken } from '@/lib/public-quote/token'
import { respondPublicQuoteSchema } from '@/lib/validations/public-quote'

interface RouteContext {
  readonly params: Promise<{ token: string }>
}

interface KnownError {
  readonly status: number
  readonly message: string
}

const INVALID_TOKEN: KnownError = { status: 410, message: 'Esta liga ya no está activa. Pide una nueva a quien te cotizó.' }

const RESPOND_ERRORS: Readonly<Record<string, KnownError>> = {
  invalid_token: INVALID_TOKEN,
  quote_expired: { status: 409, message: 'Esta cotización ya venció. Pide una actualización.' },
  owner_preview: { status: 403, message: 'Estás viendo tu propia cotización: solo tu cliente puede responder.' },
  rate_limited: { status: 429, message: 'Recibimos varias respuestas desde tu conexión. Intenta de nuevo en una hora.' },
  invalid_action: { status: 400, message: 'Acción no válida.' },
  invalid_request: { status: 400, message: 'Solicitud no válida.' },
}

const respondResultSchema = z.object({ status: z.string(), changed: z.boolean() })

/** Público: el cliente acepta o rechaza desde la liga. Idempotente; límite por IP en la base. */
export async function POST(request: NextRequest, { params }: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const { token } = await params
  if (!isPublicQuoteToken(token)) return NextResponse.json({ error: INVALID_TOKEN.message }, { status: INVALID_TOKEN.status })
  const parsed = respondPublicQuoteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('respond_public_quote', {
    p_token: token,
    p_action: parsed.data.action,
    p_reason: parsed.data.reason ?? null,
    p_name: parsed.data.name ?? null,
    p_ip_hash: hashClientIp(request),
  })
  if (error) {
    const known = RESPOND_ERRORS[error.message]
    if (known) return NextResponse.json({ error: known.message }, { status: known.status })
    logger.error('respond_public_quote failed', error)
    return NextResponse.json({ error: 'No pudimos registrar tu respuesta. Intenta de nuevo.' }, { status: 500 })
  }
  const result = respondResultSchema.safeParse(data)
  if (!result.success) {
    logger.error('respond_public_quote returned an unexpected shape')
    return NextResponse.json({ error: 'No pudimos registrar tu respuesta. Intenta de nuevo.' }, { status: 500 })
  }
  return NextResponse.json({ data: result.data })
}
