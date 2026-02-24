import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createQuoteTemplateSchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

// GET /api/templates - List quote templates
export async function GET(request: NextRequest) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for templates list', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('GET /api/templates - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/templates')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/templates')
    }

    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('active') === 'true'

    logger.database('SELECT', 'quote_templates', { orgId: profile.organization_id })
    let query = supabase
      .from('quote_templates')
      .select(
        'id, organization_id, name, description, default_items, default_terms_and_conditions, default_discount_rate, is_active, promotional_label, promotional_valid_until, created_at'
      )
      .eq('organization_id', profile.organization_id)
      .order('name')
      .limit(100)

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: templates, error } = await query

    if (error) {
      logger.error('Error fetching templates', error, { orgId: profile.organization_id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to fetch templates'),
        'GET /api/templates - select'
      )
    }

    return NextResponse.json({ data: templates || [] })
  } catch (error) {
    logger.error('Unexpected error in GET /api/templates', error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'GET /api/templates'
    )
  }
}

// POST /api/templates - Create template
export async function POST(request: NextRequest) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for template creation', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('POST /api/templates - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'POST /api/templates')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'POST /api/templates')
    }

    const body = await request.json()
    const validation = createQuoteTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      }, { status: 400 })
    }

    logger.database('INSERT', 'quote_templates', { orgId: profile.organization_id })
    const { data: template, error } = await supabase
      .from('quote_templates')
      .insert({
        name: validation.data.name,
        description: validation.data.description ?? null,
        default_items: validation.data.default_items ?? null,
        default_terms_and_conditions: validation.data.default_terms ?? null,
        default_discount_rate: validation.data.default_discount_rate ?? 0,
        is_active: validation.data.is_active ?? true,
        promotional_label: validation.data.promotional_label ?? null,
        promotional_valid_until: validation.data.promotional_valid_until ?? null,
        organization_id: profile.organization_id,
        created_by: user.id,
        usage_count: 0,
        default_valid_days: 30,
      })
      .select(
        'id, organization_id, name, description, default_items, default_terms_and_conditions, default_discount_rate, is_active, promotional_label, promotional_valid_until, created_at'
      )
      .single()

    if (error) {
      logger.error('Error creating template', error, { orgId: profile.organization_id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to create template'),
        'POST /api/templates - insert'
      )
    }

    logger.info('Template created successfully', { templateId: template.id, userId: user.id })
    return NextResponse.json({ data: template }, { status: 201 })
  } catch (error) {
    logger.error('Unexpected error in POST /api/templates', error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'POST /api/templates'
    )
  }
}
