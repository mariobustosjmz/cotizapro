import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { failureResponse, notFoundResponse, requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { activatePlanSchema, organizationIdSchema } from '@/lib/admin/schemas'
import { activatePlan } from '@/lib/admin/organizations'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return auth.response
  const id = organizationIdSchema.safeParse((await params).id)
  if (!id.success) return notFoundResponse()
  const body = activatePlanSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return validationErrorResponse(body.error)

  const result = await activatePlan(auth.supabase, id.data, body.data)
  if (!result.ok) return failureResponse(result)
  logger.info('Plan activated by platform admin', {
    organizationId: id.data,
    plan: body.data.plan,
    months: body.data.months,
    adminId: auth.userId,
  })
  return NextResponse.json({ data: result.data })
}
