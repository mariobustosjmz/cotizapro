import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

// GET /api/quotes/[id]/payments/receipt/[paymentId] - Download payment receipt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for receipt download', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id, paymentId } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('GET receipt - unauthorized access attempt', { quoteId: id, paymentId })
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/quotes/[id]/payments/receipt/[paymentId]')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET receipt')
    }

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, total, quote_number')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (quoteError || !quote) {
      logger.warn('Quote not found for receipt', { quoteId: id, userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'GET receipt')
    }

    const { data: payment, error: paymentError } = await supabase
      .from('quote_payments')
      .select('id, amount, payment_type, payment_method, payment_date, notes')
      .eq('id', paymentId)
      .eq('quote_id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (paymentError || !payment) {
      logger.warn('Payment not found for receipt', { paymentId, quoteId: id, userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Payment'), 'GET receipt')
    }

    const receiptContent = [
      'COMPROBANTE DE PAGO',
      '=====================================',
      `Fecha de emisión: ${new Date().toLocaleDateString('es-MX')}`,
      '',
      'COTIZACIÓN',
      `Número: ${quote.quote_number}`,
      `Total cotización: $${Number(quote.total).toLocaleString('es-MX')}`,
      '',
      'DETALLE DEL PAGO',
      `ID: ${payment.id}`,
      `Monto: $${Number(payment.amount).toLocaleString('es-MX')}`,
      `Tipo: ${payment.payment_type}`,
      `Método: ${payment.payment_method}`,
      `Fecha de pago: ${new Date(payment.payment_date).toLocaleDateString('es-MX')}`,
      ...(payment.notes ? [`Notas: ${payment.notes}`] : []),
      '',
      '=====================================',
      'Este comprobante es válido como recibo de pago.',
    ].join('\n')

    logger.api('GET', `/api/quotes/${id}/payments/receipt/${paymentId}`, 200, 0, {
      quoteId: id,
      paymentId,
      userId: user.id,
    })

    return new NextResponse(receiptContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="comprobante-${paymentId.slice(-8)}.txt"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    logger.error('Unexpected error in GET receipt', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'GET /api/quotes/[id]/payments/receipt/[paymentId] - unhandled exception'
    )
  }
}
