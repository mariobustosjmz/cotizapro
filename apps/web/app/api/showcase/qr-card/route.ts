import { NextRequest, NextResponse } from 'next/server'
import { requireMember } from '@/lib/auth/require-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { publicProfileUrl, qrDataUrl } from '@/lib/showcase/public-url'
import { renderQrCard } from '@/lib/pdf/qr-card'
import { formatMxPhone } from '@/lib/showcase/format-phone'

/** Tarjeta imprimible (4x6 in) con el QR de la página pública de la organización. */
export async function GET(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember()
  if (!auth.ok) return auth.response
  const [{ data: org }, { data: profile }] = await Promise.all([
    auth.ctx.supabase.from('organizations').select('name, slug').eq('id', auth.ctx.organizationId).single(),
    auth.ctx.supabase.from('public_profiles').select('display_name, headline, whatsapp_phone').eq('organization_id', auth.ctx.organizationId).maybeSingle(),
  ])
  if (!org) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
  try {
    const url = publicProfileUrl(org.slug as string, request.nextUrl.origin)
    const pdf = await renderQrCard({
      displayName: (profile?.display_name as string | undefined) ?? (org.name as string),
      headline: (profile?.headline as string | null | undefined) ?? null,
      url,
      qrPng: await qrDataUrl(url),
      whatsapp: profile?.whatsapp_phone ? formatMxPhone(profile.whatsapp_phone as string) : null,
    })
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="tarjeta-qr-${org.slug as string}.pdf"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    logger.error('qr card render failed', error, { organizationId: auth.ctx.organizationId })
    return NextResponse.json({ error: 'No se pudo generar la tarjeta' }, { status: 500 })
  }
}
