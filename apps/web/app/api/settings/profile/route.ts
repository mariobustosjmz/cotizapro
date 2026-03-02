import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateProfileSchema } from '@/lib/validations/settings'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

/**
 * PATCH /api/settings/profile
 * Update current user's profile (full_name, avatar_url)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for profile update', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('PATCH /api/settings/profile - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'PATCH /api/settings/profile')
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validation = updateProfileSchema.safeParse(body)
    if (!validation.success) {
      logger.warn('Profile update validation failed', { errors: validation.error.issues })
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid profile data: ${validation.error.issues.map(e => e.path.join('.')).join(', ')}`),
        'PATCH /api/settings/profile - validation'
      )
    }

    const { full_name, avatar_url } = validation.data

    // Update profile in database
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        full_name: full_name === undefined ? undefined : full_name,
        avatar_url: avatar_url === undefined ? undefined : avatar_url,
      })
      .eq('id', user.id)
      .select('id, email, full_name, role, avatar_url, organization_id, created_at')
      .single()

    if (error) {
      logger.error('Error updating profile in database', error, { userId: user.id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to update profile'),
        'PATCH /api/settings/profile - update error'
      )
    }

    logger.api('PATCH', '/api/settings/profile', 200, 0, { userId: user.id })

    return NextResponse.json({ data: profile })
  } catch (error) {
    logger.error('Unexpected error in PATCH /api/settings/profile', error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('An unexpected error occurred'),
      'PATCH /api/settings/profile - catch'
    )
  }
}
