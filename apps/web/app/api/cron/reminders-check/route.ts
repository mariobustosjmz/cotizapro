import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDueClientReminders } from '@/lib/reminders/due-notifications'
import { logger } from '@/lib/logger'
import { handleApiError, ApiErrors } from '@/lib/error-handler'

/**
 * Cron diario: avisa al cliente de mantenimientos y renovaciones próximos.
 * Se autoriza con CRON_SECRET y luego usa service role: no hay sesión de usuario y el encabezado
 * Authorization no debe llegar a PostgREST (antes se reenviaba como JWT y la ruta respondía 500).
 */
function isAuthorized(request: NextRequest, cronSecret: string): boolean {
  const authHeader = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${cronSecret}`
  return authHeader.length === expected.length && timingSafeEqual(Buffer.from(authHeader, 'utf-8'), Buffer.from(expected, 'utf-8'))
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || cronSecret.length < 32) {
    logger.security('CRON_SECRET not configured or too short')
    return handleApiError(ApiErrors.INTERNAL_ERROR('Cron job not properly configured'), 'Cron reminders check')
  }
  if (!isAuthorized(request, cronSecret)) {
    logger.security('Cron request with invalid authorization', { requestPath: new URL(request.url).pathname })
    return handleApiError(ApiErrors.UNAUTHORIZED(), 'Cron reminders check - invalid auth')
  }

  try {
    const summary = await sendDueClientReminders(createAdminClient(), new Date())
    logger.info('Cron reminders completed', { ...summary })
    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    logger.error('Cron reminders failed', error)
    return handleApiError(ApiErrors.INTERNAL_ERROR('Cron job failed'), 'Cron reminders check - unhandled error')
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
