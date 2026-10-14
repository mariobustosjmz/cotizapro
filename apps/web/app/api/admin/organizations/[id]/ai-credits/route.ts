import { NextResponse, type NextRequest } from 'next/server'
import { adminGrantBodySchema, getAdminAiUsage, grantAiCredits, type AiGrantError } from '@/lib/admin/ai-credits'
import { notFoundResponse, requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { organizationIdSchema } from '@/lib/admin/schemas'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ id: string }> }

interface FailureContext {
  readonly adminId: string
  readonly organizationId: string
  readonly code?: string
}

function failureResponse(failure: AiGrantError, ctx: FailureContext): NextResponse {
  if (failure.status === 500) logger.error('Admin AI credits action failed', { status: failure.status, ...ctx })
  return NextResponse.json({ error: failure.error }, { status: failure.status })
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const admin = await requirePlatformAdmin()
  if (!admin.ok) return admin.response
  const id = organizationIdSchema.safeParse((await params).id)
  if (!id.success) return notFoundResponse()

  const result = await getAdminAiUsage(admin.supabase, id.data)
  return result.ok ? NextResponse.json({ data: result.data }) : failureResponse(result.failure, { adminId: admin.userId, organizationId: id.data, code: result.code })
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const admin = await requirePlatformAdmin()
  if (!admin.ok) return admin.response
  const id = organizationIdSchema.safeParse((await params).id)
  if (!id.success) return notFoundResponse()
  const body = adminGrantBodySchema.safeParse(await request.json().catch(() => null))
  if (!body.success) return validationErrorResponse(body.error)

  const result = await grantAiCredits(admin.supabase, id.data, body.data)
  if (!result.ok) return failureResponse(result.failure, { adminId: admin.userId, organizationId: id.data, code: result.code })
  logger.security('AI credits granted by platform admin', {
    organizationId: id.data,
    credits: body.data.credits,
    source: body.data.source,
    adminId: admin.userId,
  })
  return NextResponse.json({ data: result.data }, { status: 201 })
}
