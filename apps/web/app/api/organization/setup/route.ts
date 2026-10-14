import { NextRequest, NextResponse } from 'next/server'
import { requireWritableMember } from '@/lib/billing/require-writable-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { accountSetupSchema } from '@/lib/validations/onboarding'
import { applyAccountSetup } from '@/lib/onboarding/apply-account-setup'

export async function POST(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireWritableMember(['owner'])
  if (!auth.ok) return auth.response
  const parsed = accountSetupSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)
  try {
    const data = await applyAccountSetup(auth.ctx, parsed.data)
    return NextResponse.json({ data })
  } catch (error) {
    logger.error('account setup failed', error, { organizationId: auth.ctx.organizationId })
    return NextResponse.json({ error: 'No se pudo guardar la configuración de tu cuenta' }, { status: 500 })
  }
}
