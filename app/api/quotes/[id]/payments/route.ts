import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createQuotePaymentSchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

// GET /api/quotes/[id]/payments - List all payments for a quote
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for quote payments list', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('GET /api/quotes/[id]/payments - unauthorized access attempt', { quoteId: id })
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/quotes/[id]/payments')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/quotes/[id]/payments')
    }

    // Verify quote belongs to user's organization
    logger.database('SELECT', 'quotes', { quoteId: id, orgId: profile.organization_id })
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, total')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (quoteError || !quote) {
      logger.warn('Quote not found or unauthorized access attempt', {
        quoteId: id,
        userId: user.id,
        orgId: profile.organization_id,
      })
      return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'GET /api/quotes/[id]/payments')
    }

    // Get all payments for the quote
    logger.database('SELECT', 'quote_payments', { quoteId: id })
    const { data: payments, error: paymentsError } = await supabase
      .from('quote_payments')
      .select('id, amount, payment_type, payment_method, payment_date, notes, received_by, created_at')
      .eq('quote_id', id)
      .eq('organization_id', profile.organization_id)
      .order('payment_date', { ascending: false })
      .limit(100) // Reasonable limit for API

    if (paymentsError) {
      logger.error('Error fetching quote payments', paymentsError, { quoteId: id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to fetch payments'),
        'GET /api/quotes/[id]/payments - select'
      )
    }

    // Calculate totals
    const totalPaid = (payments || []).reduce((sum, payment) => {
      return sum + Number(payment.amount)
    }, 0)

    const totalPending = Number(quote.total) - totalPaid

    logger.api('GET', `/api/quotes/${id}/payments`, 200, payments?.length || 0, {
      quoteId: id,
      userId: user.id,
      paymentCount: payments?.length || 0,
    })

    return NextResponse.json({
      data: payments || [],
      total_paid: totalPaid,
      total_pending: totalPending,
    })
  } catch (error) {
    logger.error('Unexpected error in GET /api/quotes/[id]/payments', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'GET /api/quotes/[id]/payments - unhandled exception'
    )
  }
}

// POST /api/quotes/[id]/payments - Register a new payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for payment creation', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('POST /api/quotes/[id]/payments - unauthorized access attempt', { quoteId: id })
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'POST /api/quotes/[id]/payments')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'POST /api/quotes/[id]/payments')
    }

    // Verify quote belongs to user's organization
    logger.database('SELECT', 'quotes', { quoteId: id, orgId: profile.organization_id })
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, total')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (quoteError || !quote) {
      logger.warn('Quote not found or unauthorized payment attempt', {
        quoteId: id,
        userId: user.id,
        orgId: profile.organization_id,
      })
      return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'POST /api/quotes/[id]/payments')
    }

    // Validate request body
    const body = await request.json()
    const validation = createQuotePaymentSchema.safeParse(body)

    if (!validation.success) {
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(
          `Invalid payment data: ${validation.error.issues.map(e => `${e.path.join('.')}: ${e.code}`).join(', ')}`
        ),
        'POST /api/quotes/[id]/payments - validation'
      )
    }

    // Get current total paid amount
    const { data: existingPayments, error: paymentsError } = await supabase
      .from('quote_payments')
      .select('amount')
      .eq('quote_id', id)
      .eq('organization_id', profile.organization_id)

    if (paymentsError) {
      logger.error('Error fetching existing payments', paymentsError, { quoteId: id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to verify payment amount'),
        'POST /api/quotes/[id]/payments - fetch existing'
      )
    }

    const totalPaid = (existingPayments || []).reduce((sum, payment) => {
      return sum + Number(payment.amount)
    }, 0)

    const remainingBalance = Number(quote.total) - totalPaid
    const newPaymentAmount = validation.data.amount

    // Validate payment amount does not exceed remaining balance
    if (newPaymentAmount > remainingBalance) {
      logger.warn('Payment amount exceeds remaining balance', {
        quoteId: id,
        paymentAmount: newPaymentAmount,
        remainingBalance: remainingBalance,
        userId: user.id,
      })
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(
          `Payment amount ($${newPaymentAmount.toFixed(2)}) exceeds remaining balance ($${remainingBalance.toFixed(2)})`
        ),
        'POST /api/quotes/[id]/payments - amount validation'
      )
    }

    // Insert payment
    logger.database('INSERT', 'quote_payments', { quoteId: id, amount: newPaymentAmount })
    const { data: newPayment, error: insertError } = await supabase
      .from('quote_payments')
      .insert({
        quote_id: id,
        organization_id: profile.organization_id,
        amount: newPaymentAmount,
        payment_type: validation.data.payment_type,
        payment_method: validation.data.payment_method,
        payment_date: validation.data.payment_date,
        notes: validation.data.notes || null,
        received_by: validation.data.received_by || user.id,
      })
      .select()
      .single()

    if (insertError) {
      logger.error('Error creating quote payment', insertError, { quoteId: id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to create payment'),
        'POST /api/quotes/[id]/payments - insert'
      )
    }

    logger.api('POST', `/api/quotes/${id}/payments`, 201, 1, {
      quoteId: id,
      userId: user.id,
      paymentAmount: newPaymentAmount,
    })

    return NextResponse.json({ data: newPayment }, { status: 201 })
  } catch (error) {
    logger.error('Unexpected error in POST /api/quotes/[id]/payments', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'POST /api/quotes/[id]/payments - unhandled exception'
    )
  }
}
