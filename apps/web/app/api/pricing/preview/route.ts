import { NextRequest, NextResponse } from 'next/server'
import { evaluateProduct } from '@cotizapro/quoting'
import { requireMember } from '@/lib/auth/require-member'
import { applyRateLimit, defaultApiLimiter } from '@/lib/rate-limit'
import { validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { loadPricingContext } from '@/lib/pricing/load-pricing-context'
import { pricingPreviewSchema } from '@/lib/validations/pricing'

/** Calcula una partida con el motor sin guardar nada. Acepta un servicio existente o una definición en edición. */
export async function POST(request: NextRequest) {
  const limited = defaultApiLimiter(request)
  if (limited.limited) return applyRateLimit(limited)
  const auth = await requireMember()
  if (!auth.ok) return auth.response

  const parsed = pricingPreviewSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationErrorResponse(parsed.error)
  const { service_id, definition, name, input } = parsed.data
  if (!service_id && definition === undefined) {
    return NextResponse.json({ error: 'Indica un servicio o una definición' }, { status: 400 })
  }

  try {
    const pricing = await loadPricingContext(auth.ctx, service_id ? [service_id] : [])
    const product = service_id ? pricing.products.get(service_id) : undefined
    if (service_id && !product) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    const result = evaluateProduct(product?.pricing_blocks ?? definition, input, {
      name: product?.name ?? name ?? 'Producto',
      priceLists: pricing.priceLists,
    })
    if (!result.ok) return NextResponse.json({ error: 'No se pudo calcular', errors: result.errors }, { status: 422 })
    return NextResponse.json({ data: result.value })
  } catch (error) {
    logger.error('pricing preview failed', error, { organizationId: auth.ctx.organizationId })
    return NextResponse.json({ error: 'Error interno al calcular' }, { status: 500 })
  }
}
