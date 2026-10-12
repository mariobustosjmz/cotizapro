import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { submitReviewSchema } from '@/lib/validations/showcase'

/** Público: el cliente envía su reseña con la liga de un solo uso. */
export async function POST(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const parsed = submitReviewSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const supabase = await createServerClient()
  const { error } = await supabase.rpc('submit_review', {
    p_token: parsed.data.token,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment ?? null,
  })
  if (error?.message === 'invalid_token') {
    return NextResponse.json({ error: 'Esta liga ya se usó o expiró.' }, { status: 410 })
  }
  if (error) {
    logger.error('submit_review failed', error)
    return NextResponse.json({ error: 'No pudimos guardar tu reseña. Intenta de nuevo.' }, { status: 500 })
  }
  return NextResponse.json({ data: { ok: true } }, { status: 201 })
}
