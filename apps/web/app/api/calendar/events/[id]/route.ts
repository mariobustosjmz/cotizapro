import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateWorkEventSchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import type { WorkEvent } from '@/lib/validations/cotizapro'

// GET /api/calendar/events/[id] - Get single work event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for calendar event get', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('GET /api/calendar/events/[id] - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/calendar/events/[id]')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/calendar/events/[id]')
    }

    // Fetch work event with explicit columns (RLS will enforce organization filter)
    const { data: event, error } = await supabase
      .from('work_events')
      .select('id, client_id, quote_id, assigned_to, title, event_type, scheduled_start, scheduled_end, address, notes, status, created_at')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error || !event) {
      logger.warn('Work event not found', { eventId: id, orgId: profile.organization_id })
      return handleApiError(ApiErrors.NOT_FOUND('Work event'), 'GET /api/calendar/events/[id]')
    }

    logger.api('GET', '/api/calendar/events/[id]', 200, 0, { eventId: id, userId: user.id })

    return NextResponse.json({ data: event as WorkEvent })
  } catch (error) {
    logger.error('Unexpected error in GET /api/calendar/events/[id]', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'GET /api/calendar/events/[id] - unhandled exception'
    )
  }
}

// PATCH /api/calendar/events/[id] - Update work event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for calendar event update', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('PATCH /api/calendar/events/[id] - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'PATCH /api/calendar/events/[id]')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'PATCH /api/calendar/events/[id]')
    }

    // Parse and validate request body
    const body = await request.json()

    const validation = updateWorkEventSchema.safeParse(body)

    if (!validation.success) {
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid work event data: ${validation.error.issues.map(e => `${e.path.join('.')}: ${e.code}`).join(', ')}`),
        'PATCH /api/calendar/events/[id] - validation'
      )
    }

    // Update work event (RLS will enforce organization filter)
    const { data: event, error } = await supabase
      .from('work_events')
      .update(validation.data)
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select('id, client_id, quote_id, assigned_to, title, event_type, scheduled_start, scheduled_end, address, notes, status, created_at')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('Work event not found', { eventId: id, orgId: profile.organization_id })
        return handleApiError(ApiErrors.NOT_FOUND('Work event'), 'PATCH /api/calendar/events/[id]')
      }
      logger.error('Error updating work event in database', error, { eventId: id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to update work event'),
        'PATCH /api/calendar/events/[id] - update error'
      )
    }

    logger.api('PATCH', '/api/calendar/events/[id]', 200, 0, { eventId: id, userId: user.id })

    return NextResponse.json({ data: event as WorkEvent })
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/calendar/events/[id]', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'PATCH /api/calendar/events/[id] - unhandled exception'
    )
  }
}

// DELETE /api/calendar/events/[id] - Delete work event (owner/admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for calendar event delete', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('DELETE /api/calendar/events/[id] - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'DELETE /api/calendar/events/[id]')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'DELETE /api/calendar/events/[id]')
    }

    // Delete work event (RLS will enforce organization and role filters)
    const { error } = await supabase
      .from('work_events')
      .delete()
      .eq('id', id)
      .eq('organization_id', profile.organization_id)

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('Work event not found', { eventId: id, orgId: profile.organization_id })
        return handleApiError(ApiErrors.NOT_FOUND('Work event'), 'DELETE /api/calendar/events/[id]')
      }
      logger.error('Error deleting work event in database', error, { eventId: id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to delete work event'),
        'DELETE /api/calendar/events/[id] - delete error'
      )
    }

    logger.api('DELETE', '/api/calendar/events/[id]', 204, 0, { eventId: id, userId: user.id })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    logger.error('Unexpected error in DELETE /api/calendar/events/[id]', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'DELETE /api/calendar/events/[id] - unhandled exception'
    )
  }
}
