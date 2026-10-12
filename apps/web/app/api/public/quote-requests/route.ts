import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { hashClientIp } from '@/lib/showcase/request-meta'
import { quoteRequestSchema } from '@/lib/validations/showcase'

/** Público: registra una solicitud de cotización desde la vitrina. Sin service role; límite por IP en la base. */
export async function POST(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const parsed = quoteRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)
  const { slug, name, phone, email, message, measurements, website } = parsed.data
  if (website) return NextResponse.json({ data: { ok: true } }, { status: 201 })

  const supabase = await createServerClient()
  const { error } = await supabase.rpc('submit_quote_request', {
    p_slug: slug,
    p_name: name,
    p_phone: phone,
    p_email: email || null,
    p_message: message,
    p_details: measurements ? { medidas: measurements } : {},
    p_ip_hash: hashClientIp(request),
  })
  if (error?.message === 'rate_limited') {
    return NextResponse.json({ error: 'Recibimos varias solicitudes desde tu conexión. Intenta de nuevo en una hora o escribe por WhatsApp.' }, { status: 429 })
  }
  if (error?.message === 'profile_not_found') return NextResponse.json({ error: 'Página no disponible' }, { status: 404 })
  if (error) {
    logger.error('submit_quote_request failed', error, { slug })
    return NextResponse.json({ error: 'No pudimos enviar tu solicitud. Intenta de nuevo.' }, { status: 500 })
  }
  return NextResponse.json({ data: { ok: true } }, { status: 201 })
}
