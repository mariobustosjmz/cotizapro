import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWritableMember } from '@/lib/billing/require-writable-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { validationErrorResponse } from '@/lib/error-handler'

const bodySchema = z.object({ status: z.enum(['new', 'discarded']) })

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireWritableMember(['owner', 'admin', 'member'])
  if (!auth.ok) return auth.response
  const id = z.string().uuid().safeParse((await params).id)
  if (!id.success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)
  const { data, error } = await auth.ctx.supabase
    .from('quote_requests')
    .update({ status: parsed.data.status })
    .eq('id', id.data)
    .eq('organization_id', auth.ctx.organizationId)
    .select('id, status')
    .single()
  if (error || !data) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  return NextResponse.json({ data })
}
