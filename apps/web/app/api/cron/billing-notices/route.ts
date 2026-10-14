import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { verifyCronAuthorization } from '@/lib/cron/verify-cron'
import { createAnonClient } from '@/lib/supabase/anon'
import { fetchDueNotices, rpcNoticeDeps } from '@/lib/billing/notice-rpc'
import { runBillingNotices } from '@/lib/billing/notices'

export const dynamic = 'force-dynamic'

/** Igual al LIMIT de billing_notices_due (migración 042). */
const DUE_NOTICES_LIMIT = 500

function renewUrl(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')
  return `${base}/dashboard/billing`
}

/** Cron diario (VPS: /etc/cron.d/cotizapro): avisos 7, 3 y 1 días antes y el día del vencimiento. */
export async function POST(request: NextRequest) {
  const auth = verifyCronAuthorization(request.headers.get('authorization'), process.env.CRON_SECRET)
  if (!auth.ok) {
    logger.security('Billing notices cron rejected', { reason: auth.reason })
    return NextResponse.json({ error: auth.status === 500 ? 'Cron no configurado' : 'No autorizado' }, { status: auth.status })
  }
  try {
    const supabase = createAnonClient()
    const due = await fetchDueNotices(supabase, auth.secret)
    if (!due) return NextResponse.json({ error: 'No se pudieron leer los vencimientos' }, { status: 500 })
    if (due.length >= DUE_NOTICES_LIMIT) logger.warn('Billing notices cron hit the SQL limit; remaining accounts wait for the next run', { limit: DUE_NOTICES_LIMIT })
    const summary = await runBillingNotices(due, rpcNoticeDeps(supabase, auth.secret, new Date(), renewUrl()))
    logger.info('Billing notices cron completed', { ...summary })
    return NextResponse.json({ success: true, ...summary, timestamp: new Date().toISOString() })
  } catch (error) {
    logger.error('Billing notices cron failed', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export const GET = POST
