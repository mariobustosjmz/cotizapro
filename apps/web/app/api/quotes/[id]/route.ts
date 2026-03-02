import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateQuoteSchema, type QuoteStatus } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

// Valid status transitions for quotes
const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'viewed'],
  viewed: ['accepted', 'rejected'],
  accepted: ['en_instalacion'],
  rejected: [],
  expired: [],
  en_instalacion: ['completado'],
  completado: ['cobrado'],
  cobrado: [],
}

// GET /api/quotes/[id] - Obtener cotización completa
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for quote detail', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('GET /api/quotes/[id] - unauthorized access attempt', { quoteId: id })
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/quotes/[id]')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/quotes/[id]')
    }

    // Obtener cotización con todos los detalles + Verificar que pertenece a la organización
    const { data: quote, error } = await supabase
      .from('quotes')
      .select(`
        *,
        items:quote_items(*),
        client:clients(*),
        notifications:quote_notifications(*)
      `)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error || !quote) {
      logger.warn('Quote not found or unauthorized access attempt', { quoteId: id, userId: user.id, orgId: profile.organization_id })
      return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'GET /api/quotes/[id]')
    }

    logger.api('GET', `/api/quotes/${id}`, 200, 0, { quoteId: id, userId: user.id })

    return NextResponse.json({ data: quote })
  } catch (error) {
    logger.error('Unexpected error in GET /api/quotes/[id]', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'GET /api/quotes/[id] - unhandled exception'
    )
  }
}

// PATCH /api/quotes/[id] - Actualizar cotización
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for quote update', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('PATCH /api/quotes/[id] - unauthorized access attempt', { quoteId: id })
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'PATCH /api/quotes/[id]')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'PATCH /api/quotes/[id]')
    }

    // Verificar que la cotización pertenece a la organización
    const { data: existingQuote } = await supabase
      .from('quotes')
      .select('id, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!existingQuote) {
      logger.warn('Quote not found or unauthorized update attempt', { quoteId: id, userId: user.id, orgId: profile.organization_id })
      return handleApiError(ApiErrors.FORBIDDEN(), 'PATCH /api/quotes/[id]')
    }

    // Validar datos
    const body = await request.json()
    const validation = updateQuoteSchema.safeParse(body)

    if (!validation.success) {
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid quote data: ${validation.error.issues.map(e => `${e.path.join('.')}: ${e.code}`).join(', ')}`),
        'PATCH /api/quotes/[id] - validation'
      )
    }

    const { items, discount_rate, ...updateData } = validation.data

    // Validate status transition if status is being updated
    if (updateData.status) {
      const { data: currentQuote } = await supabase
        .from('quotes')
        .select('status')
        .eq('id', id)
        .single()

      if (!currentQuote) {
        logger.warn('Quote not found during status validation', { quoteId: id })
        return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'PATCH /api/quotes/[id] - status validation')
      }

      const currentStatus = currentQuote.status as QuoteStatus
      const newStatus = updateData.status
      const allowedTransitions = VALID_TRANSITIONS[currentStatus]

      if (!allowedTransitions.includes(newStatus)) {
        logger.warn('Invalid status transition attempt', {
          quoteId: id,
          from: currentStatus,
          to: newStatus,
          userId: user.id,
        })
        return handleApiError(
          ApiErrors.VALIDATION_FAILED(`Cannot transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.join(', ')}`),
          'PATCH /api/quotes/[id] - status transition validation'
        )
      }
    }

    // Si se actualizan items, recalcular totales
    if (items) {
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price)
      }, 0)

      const discountRate = discount_rate ?? 0
      const discount_amount = subtotal * (discountRate / 100)
      const subtotal_after_discount = subtotal - discount_amount
      const tax_rate = 16.00 // IVA 16%
      const tax_amount = subtotal_after_discount * (tax_rate / 100)
      const total = subtotal_after_discount + tax_amount

      // Actualizar cotización con nuevos totales
      logger.database('UPDATE', 'quotes', { quoteId: id, itemsCount: items.length })
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          ...updateData,
          subtotal: Number(subtotal.toFixed(2)),
          tax_amount: Number(tax_amount.toFixed(2)),
          discount_rate: discountRate,
          discount_amount: Number(discount_amount.toFixed(2)),
          total: Number(total.toFixed(2)),
        })
        .eq('id', id)

      if (quoteError) {
        logger.error('Error updating quote with totals', quoteError, { quoteId: id })
        return handleApiError(
          ApiErrors.INTERNAL_ERROR('Failed to update quote'),
          'PATCH /api/quotes/[id] - quote update'
        )
      }

      // Eliminar items existentes e insertar nuevos
      logger.database('DELETE', 'quote_items', { quoteId: id })
      await supabase.from('quote_items').delete().eq('quote_id', id)

      const quoteItems = items.map((item, index) => ({
        quote_id: id,
        service_id: item.service_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_type: item.unit_type,
        subtotal: Number((item.quantity * item.unit_price).toFixed(2)),
        sort_order: index,
      }))

      logger.database('INSERT', 'quote_items', { quoteId: id, itemsCount: quoteItems.length })
      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(quoteItems)

      if (itemsError) {
        logger.error('Error updating quote items', itemsError, { quoteId: id, itemsCount: quoteItems.length })
        return handleApiError(
          ApiErrors.INTERNAL_ERROR('Failed to update quote items'),
          'PATCH /api/quotes/[id] - quote items update'
        )
      }
    } else {
      // Solo actualizar campos de cotización
      logger.database('UPDATE', 'quotes', { quoteId: id })
      const { error: quoteError } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', id)

      if (quoteError) {
        logger.error('Error updating quote fields', quoteError, { quoteId: id })
        return handleApiError(
          ApiErrors.INTERNAL_ERROR('Failed to update quote'),
          'PATCH /api/quotes/[id] - quote fields update'
        )
      }
    }

    // Obtener cotización actualizada
    logger.database('SELECT', 'quotes', { quoteId: id })
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select(`
        *,
        items:quote_items(*),
        client:clients(*)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !quote) {
      logger.error('Error fetching updated quote', fetchError, { quoteId: id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to fetch updated quote'),
        'PATCH /api/quotes/[id] - fetch updated quote'
      )
    }

    logger.api('PATCH', `/api/quotes/${id}`, 200, 0, { quoteId: id, userId: user.id })

    return NextResponse.json({ data: quote })
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/quotes/[id]', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'PATCH /api/quotes/[id] - unhandled exception'
    )
  }
}

// DELETE /api/quotes/[id] - Eliminar cotización (solo si status='draft')
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for quote deletion', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('DELETE /api/quotes/[id] - unauthorized access attempt', { quoteId: id })
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'DELETE /api/quotes/[id]')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'DELETE /api/quotes/[id]')
    }

    // Verificar que la cotización exista, pertenece a la organización, y esté en estado 'draft'
    logger.database('SELECT', 'quotes', { quoteId: id, orgId: profile.organization_id })
    const { data: quote } = await supabase
      .from('quotes')
      .select('status, organization_id')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!quote) {
      logger.warn('Quote not found or unauthorized deletion attempt', { quoteId: id, userId: user.id, orgId: profile.organization_id })
      return handleApiError(ApiErrors.NOT_FOUND('Quote'), 'DELETE /api/quotes/[id]')
    }

    if (quote.status !== 'draft') {
      logger.warn('Attempt to delete non-draft quote', { quoteId: id, status: quote.status, userId: user.id })
      return handleApiError(
        ApiErrors.VALIDATION_FAILED('Only draft quotes can be deleted'),
        'DELETE /api/quotes/[id] - status check'
      )
    }

    // Eliminar cotización (los items se eliminan automáticamente por CASCADE)
    logger.database('DELETE', 'quotes', { quoteId: id })
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Error deleting quote', error, { quoteId: id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to delete quote'),
        'DELETE /api/quotes/[id] - delete operation'
      )
    }

    logger.api('DELETE', `/api/quotes/${id}`, 200, 0, { quoteId: id, userId: user.id })

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/quotes/[id]', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'DELETE /api/quotes/[id] - unhandled exception'
    )
  }
}
