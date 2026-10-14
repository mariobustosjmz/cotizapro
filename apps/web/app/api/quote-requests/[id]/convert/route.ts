import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireWritableMember } from '@/lib/billing/require-writable-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { phoneKey } from '@/lib/showcase/phone-match'
import type { createServerClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createServerClient>>

/** Busca candidatos por los últimos 4 dígitos y compara normalizado, porque el teléfono guardado puede tener formato. */
async function findClientByPhone(supabase: Supabase, organizationId: string, phone: string): Promise<string | null> {
  const key = phoneKey(phone)
  if (key.length < 4) return null
  const { data } = await supabase
    .from('clients')
    .select('id, phone, whatsapp_phone')
    .eq('organization_id', organizationId)
    .or(`phone.ilike.%${key.slice(-4)},whatsapp_phone.ilike.%${key.slice(-4)}`)
    .limit(25)
  const match = (data ?? []).find((c) => phoneKey(c.phone as string | null) === key || phoneKey(c.whatsapp_phone as string | null) === key)
  return (match?.id as string | undefined) ?? null
}

/** Convierte una solicitud de la vitrina en cliente (reutiliza uno existente con el mismo teléfono). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireWritableMember(['owner', 'admin', 'member'])
  if (!auth.ok) return auth.response
  const id = z.string().uuid().safeParse((await params).id)
  if (!id.success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  const { supabase, organizationId, userId } = auth.ctx

  const { data: req } = await supabase
    .from('quote_requests')
    .select('id, name, phone, email, message, details, status, client_id')
    .eq('id', id.data)
    .eq('organization_id', organizationId)
    .single()
  if (!req) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (req.status === 'converted' && req.client_id) return NextResponse.json({ data: { client_id: req.client_id } })

  const existingId = await findClientByPhone(supabase, organizationId, req.phone as string)
  const details = req.details as Record<string, string>
  const notes = [`Solicitud desde la página: ${req.message}`, details.medidas ? `Medidas: ${details.medidas}` : ''].filter(Boolean).join('\n')
  const clientId =
    existingId ??
    (
      await supabase
        .from('clients')
        .insert({ organization_id: organizationId, name: req.name, phone: req.phone, whatsapp_phone: req.phone, email: req.email, notes, created_by: userId, tags: ['vitrina'] })
        .select('id')
        .single()
    ).data?.id
  if (!clientId) {
    logger.error('convert quote request: client insert failed', undefined, { requestId: req.id })
    return NextResponse.json({ error: 'No se pudo crear el cliente' }, { status: 500 })
  }
  const { error: updateError } = await supabase
    .from('quote_requests')
    .update({ status: 'converted', client_id: clientId })
    .eq('id', req.id)
    .eq('organization_id', organizationId)
  if (updateError) {
    logger.error('convert quote request: status update failed', updateError, { requestId: req.id, clientId })
    return NextResponse.json({ error: 'El cliente se creó pero la solicitud no se pudo marcar como convertida. Intenta de nuevo.' }, { status: 500 })
  }
  return NextResponse.json({ data: { client_id: clientId } }, { status: 201 })
}
