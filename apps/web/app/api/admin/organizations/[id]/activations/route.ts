import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { notFoundResponse, requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { organizationIdSchema } from '@/lib/admin/schemas'
import { listPlanActivations } from '@/lib/admin/organizations'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requirePlatformAdmin()
  if (!auth.ok) return auth.response
  const id = organizationIdSchema.safeParse((await params).id)
  if (!id.success) return notFoundResponse()

  const result = await listPlanActivations(auth.supabase, id.data)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json({ data: result.rows })
}
