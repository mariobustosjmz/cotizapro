import { NextRequest, NextResponse } from 'next/server'
import { requireMember } from '@/lib/auth/require-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const STATUSES = new Set(['new', 'converted', 'discarded'])

export async function GET(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember()
  if (!auth.ok) return auth.response
  const status = request.nextUrl.searchParams.get('status')
  let query = auth.ctx.supabase
    .from('quote_requests')
    .select('id, name, phone, email, message, details, status, client_id, quote_id, created_at', { count: 'exact' })
    .eq('organization_id', auth.ctx.organizationId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (status && STATUSES.has(status)) query = query.eq('status', status)
  const { data, error, count } = await query
  if (error) {
    logger.error('quote_requests list failed', error, { organizationId: auth.ctx.organizationId })
    return NextResponse.json({ error: 'No se pudieron cargar las solicitudes' }, { status: 500 })
  }
  return NextResponse.json({ data, total: count ?? 0 })
}
