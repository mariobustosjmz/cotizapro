import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createReminderSchema, reminderQuerySchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

// GET /api/reminders - List reminders with filters
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for reminders list', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('GET /api/reminders - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/reminders')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/reminders')
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      client_id: searchParams.get('client_id') || undefined,
      status: searchParams.get('status') || undefined,
      priority: searchParams.get('priority') || undefined,
      reminder_type: searchParams.get('reminder_type') || undefined,
      from_date: searchParams.get('from_date') || undefined,
      to_date: searchParams.get('to_date') || undefined,
      due_only: searchParams.get('due_only') === 'true',
      days_ahead: parseInt(searchParams.get('days_ahead') || '7'),
    }

    const validation = reminderQuerySchema.safeParse(queryParams)
    if (!validation.success) {
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid query parameters: ${validation.error.issues.map(e => e.code).join(', ')}`),
        'GET /api/reminders - query validation'
      )
    }

    const { limit, offset, client_id, status, priority, reminder_type, from_date, to_date, due_only, days_ahead } = validation.data

    // Build query without join (split queries to avoid RLS issues)
    let query = supabase
      .from('follow_up_reminders')
      .select('*', { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('scheduled_date', { ascending: true })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (client_id) {
      query = query.eq('client_id', client_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (reminder_type) {
      query = query.eq('reminder_type', reminder_type)
    }

    if (from_date) {
      query = query.gte('scheduled_date', from_date)
    }

    if (to_date) {
      query = query.lte('scheduled_date', to_date)
    }

    // Filter for due reminders only
    if (due_only) {
      const today = new Date()
      const futureDate = new Date()
      futureDate.setDate(today.getDate() + days_ahead)

      query = query
        .eq('status', 'pending')
        .lte('scheduled_date', futureDate.toISOString().split('T')[0])
    }

    const { data: reminders, error, count } = await query

    if (error) {
      logger.error('Error fetching reminders from database', error, { orgId: profile.organization_id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to fetch reminders'),
        'GET /api/reminders - query error'
      )
    }

    // If we got reminders, fetch client names separately
    if (reminders && reminders.length > 0) {
      const clientIds = [...new Set(reminders.map(r => r.client_id))]
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name, email, phone, whatsapp_phone')
        .in('id', clientIds)

      // Map client data to reminders
      const clientsMap = new Map(clients?.map(c => [c.id, c]) || [])
      reminders.forEach(r => {
        r.client = clientsMap.get(r.client_id) || null
      })
    }

    logger.api('GET', '/api/reminders', 200, 0, { count: count || 0, userId: user.id })

    return NextResponse.json({
      reminders,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    logger.error('Unexpected error in GET /api/reminders', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'GET /api/reminders - unhandled exception'
    )
  }
}

// POST /api/reminders - Create new reminder
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for reminder creation', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('POST /api/reminders - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'POST /api/reminders')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'POST /api/reminders')
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = createReminderSchema.safeParse(body)

    if (!validation.success) {
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid reminder data: ${validation.error.issues.map(e => `${e.path.join('.')}: ${e.code}`).join(', ')}`),
        'POST /api/reminders - validation'
      )
    }

    // Validate recurrence: if is_recurring is true, recurrence_interval_months must be provided
    if (validation.data.is_recurring && !validation.data.recurrence_interval_months) {
      return handleApiError(
        ApiErrors.VALIDATION_FAILED('For recurring reminders, recurrence_interval_months must be specified'),
        'POST /api/reminders - recurrence validation'
      )
    }

    // Verify client belongs to organization
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', validation.data.client_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (!client) {
      logger.warn('Client not found in organization', { clientId: validation.data.client_id, orgId: profile.organization_id })
      return handleApiError(ApiErrors.NOT_FOUND('Client in organization'), 'POST /api/reminders')
    }

    // Insert reminder without join (split queries to avoid RLS issues)
    const { data: reminder, error } = await supabase
      .from('follow_up_reminders')
      .insert({
        ...validation.data,
        organization_id: profile.organization_id,
        created_by: user.id,
        status: 'pending',
      })
      .select('*')
      .single()

    if (error) {
      logger.error('Error creating reminder in database', error, { orgId: profile.organization_id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to create reminder'),
        'POST /api/reminders - insert error'
      )
    }

    // Fetch client separately
    const { data: clientData } = await supabase
      .from('clients')
      .select('id, name, email, phone, whatsapp_phone')
      .eq('id', reminder.client_id)
      .single()

    // Map client data to reminder
    const reminderWithClient = {
      ...reminder,
      client: clientData
    }

    logger.api('POST', '/api/reminders', 201, 0, { reminderId: reminder.id, userId: user.id })

    return NextResponse.json({ reminder: reminderWithClient }, { status: 201 })
  } catch (error) {
    logger.error('Unexpected error in POST /api/reminders', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'POST /api/reminders - unhandled exception'
    )
  }
}
