import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuthorization } from '@/lib/cron/verify-cron'
import { createAnonClient } from '@/lib/supabase/anon'
import { sendDueClientReminders } from '@/lib/reminders/due-notifications'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/** Cron diario: avisa al cliente de mantenimientos y renovaciones próximos. Sin service role: la base valida el hash del secreto. */
export async function GET(request: NextRequest) {
  const auth = verifyCronAuthorization(request.headers.get('authorization'), process.env.CRON_SECRET)
  if (!auth.ok) {
    logger.security('Reminders cron rejected', { reason: auth.reason })
    return NextResponse.json({ error: auth.status === 500 ? 'Cron no configurado' : 'No autorizado' }, { status: auth.status })
  }
  try {
    const summary = await sendDueClientReminders(createAnonClient(), auth.secret, new Date())
    logger.info('Cron reminders completed', { ...summary })
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    logger.error('Cron reminders failed', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export const POST = GET
