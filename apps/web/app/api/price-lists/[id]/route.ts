import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMember } from '@/lib/auth/require-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { updatePriceListSchema } from '@/lib/validations/pricing'

const COLUMNS = 'id, name, unit, dimensions, rows, is_active, updated_at'
const idSchema = z.string().uuid()

interface RouteParams {
  readonly params: Promise<{ id: string }>
}

interface Row {
  readonly keys: Record<string, string>
  readonly price: number
}

function adjustRows(rows: readonly Row[], percent: number): readonly Row[] {
  return rows.map((row) => ({ ...row, price: Math.round(row.price * (1 + percent / 100) * 100) / 100 }))
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember(['owner', 'admin'])
  if (!auth.ok) return auth.response
  const id = idSchema.safeParse((await params).id)
  if (!id.success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const parsed = updatePriceListSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)
  const { adjust_percent, ...changes } = parsed.data

  const { data: current, error: readError } = await auth.ctx.supabase
    .from('price_lists')
    .select('rows')
    .eq('id', id.data)
    .eq('organization_id', auth.ctx.organizationId)
    .single()
  if (readError || !current) return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })

  const baseRows = (changes.rows ?? current.rows) as readonly Row[]
  const rows = adjust_percent !== undefined ? adjustRows(baseRows, adjust_percent) : changes.rows
  const { data, error } = await auth.ctx.supabase
    .from('price_lists')
    .update({ ...changes, ...(rows ? { rows } : {}) })
    .eq('id', id.data)
    .eq('organization_id', auth.ctx.organizationId)
    .select(COLUMNS)
    .single()
  if (error) {
    logger.error('price_lists update failed', error, { id: id.data })
    return NextResponse.json({ error: 'No se pudo actualizar la lista' }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember(['owner', 'admin'])
  if (!auth.ok) return auth.response
  const id = idSchema.safeParse((await params).id)
  if (!id.success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { error } = await auth.ctx.supabase
    .from('price_lists')
    .update({ is_active: false })
    .eq('id', id.data)
    .eq('organization_id', auth.ctx.organizationId)
  if (error) {
    logger.error('price_lists archive failed', error, { id: id.data })
    return NextResponse.json({ error: 'No se pudo archivar la lista' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
