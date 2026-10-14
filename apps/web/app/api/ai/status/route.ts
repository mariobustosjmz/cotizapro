import { NextResponse, type NextRequest } from 'next/server'
import { requireMember } from '@/lib/auth/require-member'
import { aiErrorResponse } from '@/lib/ai/http'
import { aiRuntime, type AiRuntime } from '@/lib/ai/runtime'
import { getUsageSummary } from '@/lib/ai/usage'
import { logger } from '@/lib/logger'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const MISMATCH_LOGGED_KEY = Symbol.for('cotizapro.aiLimitsMismatchLogged')
type GlobalWithFlag = typeof globalThis & { [MISMATCH_LOGGED_KEY]?: boolean }

function tryRuntime(): AiRuntime | null {
  try {
    return aiRuntime()
  } catch (error) {
    logger.error('AI runtime config invalid', error)
    return null
  }
}

/** Una vez por proceso: el cliente consulta este endpoint con frecuencia. */
function warnLimitsMismatchOnce(app: boolean, db: boolean): void {
  const store = globalThis as GlobalWithFlag
  if (store[MISMATCH_LOGGED_KEY]) return
  store[MISMATCH_LOGGED_KEY] = true
  logger.warn('AI_LIMITS_ENFORCED does not match ai.limits_enforced', { app, db })
}

/** Solo lectura: una empresa en modo de solo lectura puede consultar su saldo. */
export async function GET(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember()
  if (!auth.ok) return auth.response
  try {
    const runtime = tryRuntime()
    const [available, summary] = await Promise.all([runtime ? runtime.health.isAvailable() : false, getUsageSummary(auth.ctx.supabase)])
    if (runtime && summary.enforced !== runtime.config.limitsEnforced) warnLimitsMismatchOnce(runtime.config.limitsEnforced, summary.enforced)
    return NextResponse.json({ data: { available, summary } })
  } catch (error) {
    logger.error('ai status failed', error, { organizationId: auth.ctx.organizationId })
    return aiErrorResponse(error)
  }
}
