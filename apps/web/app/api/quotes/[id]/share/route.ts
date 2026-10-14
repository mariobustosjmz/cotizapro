import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireMember } from '@/lib/auth/require-member'
import { requireWritableMember } from '@/lib/billing/require-writable-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { createQuoteShareLink } from '@/lib/quotes/share-link'
import { logger } from '@/lib/logger'

interface RouteContext {
  readonly params: Promise<{ id: string }>
}

const WORKERS = ['owner', 'admin', 'member'] as const
const quoteIdSchema = z.guid()

async function quoteIdFrom(context: RouteContext): Promise<string | null> {
  const parsed = quoteIdSchema.safeParse((await context.params).id)
  return parsed.success ? parsed.data : null
}

function invalidId(): NextResponse {
  return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
}

/** Liga activa de la cotización. El token no se puede volver a mostrar: solo existe al crearla. */
export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember()
  if (!auth.ok) return auth.response
  const id = await quoteIdFrom(context)
  if (!id) return invalidId()

  const { data, error } = await auth.ctx.supabase
    .from('quote_shares')
    .select('expires_at, first_viewed_at, created_at')
    .eq('quote_id', id)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) {
    logger.error('quote_shares lookup failed', error, { quoteId: id })
    return NextResponse.json({ error: 'No se pudo consultar la liga' }, { status: 500 })
  }
  return NextResponse.json({ data: data?.[0] ?? null })
}

export async function POST(request: NextRequest, context: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireWritableMember(WORKERS)
  if (!auth.ok) return auth.response
  const id = await quoteIdFrom(context)
  if (!id) return invalidId()

  const share = await createQuoteShareLink(auth.ctx.supabase, id, request.nextUrl.origin)
  if (!share.ok) return NextResponse.json({ error: share.error }, { status: share.status })
  return NextResponse.json({ data: { url: share.url } }, { status: 201 })
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireWritableMember(WORKERS)
  if (!auth.ok) return auth.response
  const id = await quoteIdFrom(context)
  if (!id) return invalidId()

  const { data, error } = await auth.ctx.supabase
    .from('quote_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('quote_id', id)
    .is('revoked_at', null)
    .select('id')
  if (error) {
    logger.error('quote_shares revoke failed', error, { quoteId: id })
    return NextResponse.json({ error: 'No se pudo revocar la liga' }, { status: 500 })
  }
  return NextResponse.json({ data: { revoked: (data ?? []).length } })
}
