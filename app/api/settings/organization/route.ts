import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateOrganizationSchema } from '@/lib/validations/settings'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

/**
 * PATCH /api/settings/organization
 * Update organization settings (name, company_address, phone, email, quote_terms, etc.)
 * Only accessible by owner or admin role
 */
export async function PATCH(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for organization update', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('PATCH /api/settings/organization - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'PATCH /api/settings/organization')
    }

    // Get user's profile and organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'PATCH /api/settings/organization')
    }

    // Verify user has permission to update organization (owner or admin)
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      logger.security('PATCH /api/settings/organization - insufficient permissions', {
        userId: user.id,
        role: profile.role,
        orgId: profile.organization_id,
      })
      return handleApiError(ApiErrors.FORBIDDEN(), 'PATCH /api/settings/organization')
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validation = updateOrganizationSchema.safeParse(body)
    if (!validation.success) {
      logger.warn('Organization update validation failed', { errors: validation.error.issues })
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid organization data: ${validation.error.issues.map(e => e.path.join('.')).join(', ')}`),
        'PATCH /api/settings/organization - validation'
      )
    }

    const {
      name,
      company_address,
      company_phone,
      company_email,
      quote_terms,
      quote_valid_days,
      tax_rate,
    } = validation.data

    // Build settings object (only include provided values)
    const settings = {
      ...(company_address !== undefined && { company_address }),
      ...(company_phone !== undefined && { company_phone }),
      ...(company_email !== undefined && { company_email }),
      ...(quote_terms !== undefined && { quote_terms }),
      ...(quote_valid_days !== undefined && { quote_valid_days }),
      ...(tax_rate !== undefined && { tax_rate }),
    }

    // Update organization
    const { data: organization, error } = await supabase
      .from('organizations')
      .update({
        name,
        ...(Object.keys(settings).length > 0 && { settings }),
      })
      .eq('id', profile.organization_id)
      .select('id, name, slug, settings')
      .single()

    if (error) {
      logger.error('Error updating organization in database', error, {
        orgId: profile.organization_id,
        userId: user.id,
      })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to update organization'),
        'PATCH /api/settings/organization - update error'
      )
    }

    logger.api('PATCH', '/api/settings/organization', 200, 0, {
      userId: user.id,
      orgId: profile.organization_id,
    })

    return NextResponse.json({ data: organization })
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/settings/organization', error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('An unexpected error occurred'),
      'PATCH /api/settings/organization - catch'
    )
  }
}
