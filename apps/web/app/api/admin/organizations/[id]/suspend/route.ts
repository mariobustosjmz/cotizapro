import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { failureResponse, notFoundResponse, requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { organizationIdSchema, suspendPlanSchema } from '@/lib/admin/schemas'
import { suspendPlan } from '@/lib/admin/organizations'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return auth.response
  const id = organizationIdSchema.safeParse((await params).id)
  if (!id.success) return notFoundResponse()
  const body = suspendPlanSchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return validationErrorResponse(body.error)

  const result = await suspendPlan(auth.supabase, id.data, body.data.reason)
  if (!result.ok) return failureResponse(result)
  logger.info('Plan suspended by platform admin', { organizationId: id.data, adminId: auth.userId })
  return NextResponse.json({ data: result.data })
}
