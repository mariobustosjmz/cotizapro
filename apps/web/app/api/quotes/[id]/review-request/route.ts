import { NextRequest, NextResponse } from 'next/server'
import { whatsappLink } from '@/lib/whatsapp/link'
import { z } from 'zod'
import { requireMember } from '@/lib/auth/require-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const ERRORS: Readonly<Record<string, { status: number; message: string }>> = {
  quote_not_found: { status: 404, message: 'Cotización no encontrada' },
  quote_not_paid: { status: 409, message: 'Solo se puede pedir reseña de trabajos cobrados' },
  already_reviewed: { status: 409, message: 'Este cliente ya dejó su reseña' },
  forbidden: { status: 403, message: 'No tienes permiso' },
}

/** Genera la liga de reseña de un solo uso y el mensaje listo para WhatsApp. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember(['owner', 'admin', 'member'])
  if (!auth.ok) return auth.response
  const id = z.string().uuid().safeParse((await params).id)
  if (!id.success) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const { data: token, error } = await auth.ctx.supabase.rpc('create_review_request', { p_quote_id: id.data })
  if (error) {
    const known = ERRORS[error.message]
    if (known) return NextResponse.json({ error: known.message }, { status: known.status })
    logger.error('create_review_request failed', error, { quoteId: id.data })
    return NextResponse.json({ error: 'No se pudo generar la liga' }, { status: 500 })
  }

  const { data: quote } = await auth.ctx.supabase
    .from('quotes')
    .select('quote_number, client:clients(name, whatsapp_phone, phone)')
    .eq('id', id.data)
    .single()
  const client = quote?.client as unknown as { name: string; whatsapp_phone: string | null; phone: string | null } | null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin
  const url = `${appUrl}/r/${token as string}`
  const message = `Hola ${client?.name?.split(' ')[0] ?? ''}, gracias por confiar en nosotros. ¿Nos ayudas calificando el trabajo? Solo toma un minuto: ${url}`
  return NextResponse.json({
    data: { url, message, whatsapp_url: whatsappLink(client?.whatsapp_phone ?? client?.phone, message) },
  }, { status: 201 })
}
