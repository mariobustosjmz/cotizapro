import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

// DELETE /api/quotes/[id]/payments/[paymentId] - Delete a payment (admin/owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for payment deletion', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id, paymentId } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('DELETE /api/quotes/[id]/payments/[paymentId] - unauthorized access attempt', {
        quoteId: id,
        paymentId: paymentId,
      })
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'DELETE /api/quotes/[id]/payments/[paymentId]')
    }

    // Get user's organization and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'DELETE /api/quotes/[id]/payments/[paymentId]')
    }

    // Check if user is admin or owner (role-based authorization)
    if (!['owner', 'admin'].includes(profile.role)) {
      logger.security('DELETE /api/quotes/[id]/payments/[paymentId] - insufficient permissions', {
        userId: user.id,
        userRole: profile.role,
        quoteId: id,
        paymentId: paymentId,
      })
      return handleApiError(ApiErrors.FORBIDDEN(), 'DELETE /api/quotes/[id]/payments/[paymentId]')
    }

    // Verify quote belongs to user's organization
    logger.database('SELECT', 'quotes', { quoteId: id, orgId: profile.organization_id })
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (quoteError || !quote) {
      logger.warn('Quote not found or unauthorized access attempt', {
        quoteId: id,
        userId: user.id,
        orgId: profile.organization_id,
      })
      return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'DELETE /api/quotes/[id]/payments/[paymentId]')
    }

    // Verify payment belongs to this quote and organization
    logger.database('SELECT', 'quote_payments', { paymentId: paymentId, quoteId: id })
    const { data: payment, error: paymentError } = await supabase
      .from('quote_payments')
      .select('id, quote_id, organization_id')
      .eq('id', paymentId)
      .eq('quote_id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (paymentError || !payment) {
      logger.warn('Payment not found or unauthorized deletion attempt', {
        paymentId: paymentId,
        quoteId: id,
        userId: user.id,
        orgId: profile.organization_id,
      })
      return handleApiError(ApiErrors.NOT_FOUND('Payment'), 'DELETE /api/quotes/[id]/payments/[paymentId]')
    }

    // Delete payment
    logger.database('DELETE', 'quote_payments', { paymentId: paymentId })
    const { error: deleteError } = await supabase
      .from('quote_payments')
      .delete()
      .eq('id', paymentId)

    if (deleteError) {
      logger.error('Error deleting quote payment', deleteError, { paymentId: paymentId, quoteId: id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to delete payment'),
        'DELETE /api/quotes/[id]/payments/[paymentId] - delete'
      )
    }

    logger.api('DELETE', `/api/quotes/${id}/payments/${paymentId}`, 204, 0, {
      quoteId: id,
      paymentId: paymentId,
      userId: user.id,
    })

    return NextResponse.json({ data: { success: true } }, { status: 204 })
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/quotes/[id]/payments/[paymentId]', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'DELETE /api/quotes/[id]/payments/[paymentId] - unhandled exception'
    )
  }
}
