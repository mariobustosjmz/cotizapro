import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClientSchema, clientQuerySchema } from '@/lib/validations/cotizapro'
import type { Client } from '@/types/database.types'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'
import { sanitizeSearchInput } from '@/lib/search-sanitizer'

// GET /api/clients - List clients with pagination and search
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for clients list', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('GET /api/clients - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/clients')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/clients')
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      search: searchParams.get('search') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
    }

    const validation = clientQuerySchema.safeParse(queryParams)
    if (!validation.success) {
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid query parameters: ${validation.error.issues.map(e => e.code).join(', ')}`),
        'GET /api/clients - query validation'
      )
    }

    const { search, limit, offset, tags } = validation.data

    // Sanitize and escape search input for LIKE queries
    const sanitizedSearch = sanitizeSearchInput(search)

    // Build query
    let query = supabase
      .from('clients')
      .select('id, name, email, phone, company_name, address, notes, created_at, organization_id', { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add search filter with properly escaped wildcards
    if (sanitizedSearch) {
      logger.database('SEARCH', 'clients', { searchTerm: '[REDACTED]', fieldsSearched: 3 })
      query = query.or(`name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%,phone.ilike.%${sanitizedSearch}%`)
    }

    // Add tags filter
    if (tags && tags.length > 0) {
      query = query.contains('tags', tags)
    }

    const { data: clients, error, count } = await query

    if (error) {
      logger.error('Error fetching clients from database', error, { orgId: profile.organization_id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to fetch clients'),
        'GET /api/clients - query error'
      )
    }

    logger.api('GET', '/api/clients', 200, 0, { count: count || 0, userId: user.id })

    return NextResponse.json({
      clients,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    logger.error('Unexpected error in GET /api/clients', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'GET /api/clients - unhandled exception'
    )
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for client creation', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('POST /api/clients - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'POST /api/clients')
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'POST /api/clients')
    }

    // Parse and validate request body
    const body = await request.json()

    // Convert empty strings to null for optional fields
    const sanitizedBody = {
      ...body,
      email: body.email === '' ? null : body.email,
      phone: body.phone === '' ? null : body.phone,
      whatsapp_phone: body.whatsapp_phone === '' ? null : body.whatsapp_phone,
      address: body.address === '' ? null : body.address,
      city: body.city === '' ? null : body.city,
      state: body.state === '' ? null : body.state,
      postal_code: body.postal_code === '' ? null : body.postal_code,
      notes: body.notes === '' ? null : body.notes,
    }

    const validation = createClientSchema.safeParse(sanitizedBody)

    if (!validation.success) {
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid client data: ${validation.error.issues.map(e => `${e.path.join('.')}: ${e.code}`).join(', ')}`),
        'POST /api/clients - validation'
      )
    }

    // Insert client
    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        ...validation.data,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating client in database', error, { orgId: profile.organization_id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to create client'),
        'POST /api/clients - insert error'
      )
    }

    logger.api('POST', '/api/clients', 201, 0, { clientId: client.id, userId: user.id })

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    logger.error('Unexpected error in POST /api/clients', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'POST /api/clients - unhandled exception'
    )
  }
}
