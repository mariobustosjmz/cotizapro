import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { requireWritableMember } from '@/lib/billing/require-writable-member'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { reviewReplySchema } from '@/lib/validations/showcase'

const NOT_FOUND = { error: 'Reseña no encontrada' }

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireWritableMember(['owner', 'admin'])
  if (!auth.ok) return auth.response
  const { id } = await params
  if (!z.guid().safeParse(id).success) return NextResponse.json({ error: 'Identificador de reseña no válido' }, { status: 400 })
  const parsed = reviewReplySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const { data, error } = await auth.ctx.supabase
    .from('reviews')
    .update({ owner_reply: parsed.data.owner_reply || null })
    .eq('id', id)
    .eq('organization_id', auth.ctx.organizationId)
    .select('id, owner_reply')
    .maybeSingle()
  if (error) {
    logger.error('review reply update failed', error, { reviewId: id, organizationId: auth.ctx.organizationId })
    return NextResponse.json({ error: 'No se pudo guardar la respuesta' }, { status: 500 })
  }
  if (!data) return NextResponse.json(NOT_FOUND, { status: 404 })
  revalidatePath('/p/[slug]', 'page')
  return NextResponse.json({ data })
}
