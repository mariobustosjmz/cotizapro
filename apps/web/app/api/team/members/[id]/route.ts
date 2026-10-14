import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { memberRpcError } from '@/lib/team/member-errors'
import { assertWritable } from '@/lib/billing/writable'

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
})

const memberIdSchema = z.string().uuid()

/** PATCH /api/team/members/[id]: cambia el rol (reglas en la RPC set_member_role). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limitResult = defaultApiLimiter(request)
  if (limitResult.limited) return applyRateLimit(limitResult)

  const { id } = await params
  if (!memberIdSchema.safeParse(id).success) return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })

  const body: unknown = await request.json().catch(() => null)
  const validation = updateMemberSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: validation.error.issues }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const blocked = await assertWritable(supabase)
  if (blocked) return blocked

  const { data: member, error } = await supabase.rpc('set_member_role', { p_member: id, p_role: validation.data.role })
  if (error) {
    const mapped = memberRpcError(error.message)
    if (mapped.status === 500) logger.error('set_member_role failed', error, { member: id })
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }
  return NextResponse.json({ member })
}

/** DELETE /api/team/members/[id]: quita al miembro de la organización (RPC remove_member). */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limitResult = defaultApiLimiter(request)
  if (limitResult.limited) return applyRateLimit(limitResult)

  const { id } = await params
  if (!memberIdSchema.safeParse(id).success) return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const blocked = await assertWritable(supabase)
  if (blocked) return blocked

  const { error } = await supabase.rpc('remove_member', { p_member: id })
  if (error) {
    const mapped = memberRpcError(error.message)
    if (mapped.status === 500) logger.error('remove_member failed', error, { member: id })
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }
  return NextResponse.json({ success: true })
}
