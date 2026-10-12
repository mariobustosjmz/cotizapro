import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireMember } from '@/lib/auth/require-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { publicProfileUpdateSchema } from '@/lib/validations/showcase'

const COLUMNS = 'display_name, headline, bio, service_area, city, whatsapp_phone, contact_email, logo_path, is_published, show_prices, updated_at'

export async function GET(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember()
  if (!auth.ok) return auth.response
  const [{ data: profile }, { data: org }] = await Promise.all([
    auth.ctx.supabase.from('public_profiles').select(COLUMNS).eq('organization_id', auth.ctx.organizationId).maybeSingle(),
    auth.ctx.supabase.from('organizations').select('name, slug, account_type, trade').eq('id', auth.ctx.organizationId).single(),
  ])
  return NextResponse.json({ data: { profile, organization: org } })
}

export async function PUT(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember(['owner', 'admin'])
  if (!auth.ok) return auth.response
  const parsed = publicProfileUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)

  const row = {
    ...parsed.data,
    whatsapp_phone: parsed.data.whatsapp_phone || null,
    contact_email: parsed.data.contact_email || null,
    organization_id: auth.ctx.organizationId,
  }
  const { data, error } = await auth.ctx.supabase.from('public_profiles').upsert(row, { onConflict: 'organization_id' }).select(COLUMNS).single()
  if (error) {
    logger.error('public_profiles upsert failed', error, { organizationId: auth.ctx.organizationId })
    return NextResponse.json({ error: 'No se pudo guardar tu página' }, { status: 500 })
  }
  revalidatePath('/p/[slug]', 'page')
  return NextResponse.json({ data })
}
