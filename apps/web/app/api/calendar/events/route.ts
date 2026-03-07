import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createWorkEventSchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors, validationErrorResponse } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import type { WorkEvent } from '@/lib/validations/cotizapro'

// GET /api/calendar/events - List work events with filters
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for calendar events list', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('GET /api/calendar/events - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/calendar/events')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/calendar/events')
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const from_date = searchParams.get('from_date') || undefined
    const to_date = searchParams.get('to_date') || undefined
    const client_id = searchParams.get('client_id') || undefined
    const event_type = searchParams.get('event_type') || undefined
    const status = searchParams.get('status') || undefined
    const quote_id = searchParams.get('quote_id') || undefined

    // Build query with explicit columns
    let query = supabase
      .from('work_events')
      .select('id, client_id, quote_id, assigned_to, title, event_type, scheduled_start, scheduled_end, address, notes, status, created_at', { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('scheduled_start', { ascending: true })
      .limit(200)

    // Apply filters
    if (from_date) {
      query = query.gte('scheduled_start', from_date)
    }

    if (to_date) {
      query = query.lte('scheduled_start', to_date)
    }

    if (client_id) {
      query = query.eq('client_id', client_id)
    }

    if (event_type) {
      query = query.eq('event_type', event_type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (quote_id) {
      query = query.eq('quote_id', quote_id)
    }

    const { data: events, error, count } = await query

    if (error) {
      logger.error('Error fetching work events from database', error, { orgId: profile.organization_id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to fetch work events'),
        'GET /api/calendar/events - query error'
      )
    }

    logger.api('GET', '/api/calendar/events', 200, 0, { count: count || 0, userId: user.id })

    return NextResponse.json({
      data: (events as WorkEvent[]) || [],
      total: count || 0,
    })
  } catch (error) {
    logger.error('Unexpected error in GET /api/calendar/events', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'GET /api/calendar/events - unhandled exception'
    )
  }
}

// POST /api/calendar/events - Create new work event
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for work event creation', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('POST /api/calendar/events - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'POST /api/calendar/events')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'POST /api/calendar/events')
    }

    // Parse and validate request body
    const body = await request.json()

    const validation = createWorkEventSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('Validation failed for work event creation', { issues: validation.error.issues })
      return validationErrorResponse(validation.error)
    }

    // Insert work event
    const { data: event, error } = await supabase
      .from('work_events')
      .insert({
        ...validation.data,
        organization_id: profile.organization_id,
      })
      .select('id, client_id, quote_id, assigned_to, title, event_type, scheduled_start, scheduled_end, address, notes, status, created_at')
      .single()

    if (error) {
      logger.error('Error creating work event in database', error, { orgId: profile.organization_id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to create work event'),
        'POST /api/calendar/events - insert error'
      )
    }

    logger.api('POST', '/api/calendar/events', 201, 0, { eventId: event.id, userId: user.id })

    return NextResponse.json({ data: event as WorkEvent }, { status: 201 })
  } catch (error) {
    logger.error('Unexpected error in POST /api/calendar/events', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'POST /api/calendar/events - unhandled exception'
    )
  }
}
