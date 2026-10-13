import { NextRequest, NextResponse } from 'next/server'
import { requireMember } from '@/lib/auth/require-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

/** DELETE /api/onboarding/checklist: oculta la tarjeta de primeros pasos para toda la empresa. */
export async function DELETE(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember(['owner', 'admin'])
  if (!auth.ok) return auth.response

  const { error } = await auth.ctx.supabase.rpc('update_org_settings', {
    p_name: null,
    p_settings: { checklist_dismissed_at: new Date().toISOString() },
  })
  if (error) {
    logger.error('dismiss checklist failed', error, { organizationId: auth.ctx.organizationId })
    return NextResponse.json({ error: 'No se pudo ocultar' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
