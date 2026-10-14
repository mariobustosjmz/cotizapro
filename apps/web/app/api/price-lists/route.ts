import { NextRequest, NextResponse } from 'next/server'
import { requireMember } from '@/lib/auth/require-member'
import { requireWritableMember } from '@/lib/billing/require-writable-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { createPriceListSchema } from '@/lib/validations/pricing'

const COLUMNS = 'id, name, unit, dimensions, rows, is_active, updated_at'

export async function GET(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember()
  if (!auth.ok) return auth.response

  const { data, error } = await auth.ctx.supabase
    .from('price_lists')
    .select(COLUMNS)
    .eq('organization_id', auth.ctx.organizationId)
    .order('name')
    .limit(200)
  if (error) {
    logger.error('price_lists list failed', error, { organizationId: auth.ctx.organizationId })
    return NextResponse.json({ error: 'No se pudieron cargar las listas de precios' }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireWritableMember(['owner', 'admin'])
  if (!auth.ok) return auth.response

  const parsed = createPriceListSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const { data, error } = await auth.ctx.supabase
    .from('price_lists')
    .insert({ ...parsed.data, organization_id: auth.ctx.organizationId })
    .select(COLUMNS)
    .single()
  if (error) {
    logger.error('price_lists insert failed', error, { organizationId: auth.ctx.organizationId })
    return NextResponse.json({ error: 'No se pudo crear la lista de precios' }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}
