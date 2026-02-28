import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { changePasswordSchema } from '@/lib/validations/settings'
import { strictAuthLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

/**
 * POST /api/settings/password
 * Change user's password
 * Uses stricter rate limiting to prevent brute force attacks
 */
export async function POST(request: NextRequest) {
  try {
    // Use strict rate limiting for password changes
    const limitResult = strictAuthLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for password change', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('POST /api/settings/password - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'POST /api/settings/password')
    }

    // Parse request body
    const body = await request.json()

    // Validate input
    const validation = changePasswordSchema.safeParse(body)
    if (!validation.success) {
      logger.warn('Password change validation failed', { errors: validation.error.issues })
      return handleApiError(
        ApiErrors.VALIDATION_FAILED(`Invalid password: ${validation.error.issues.map(e => e.message).join(', ')}`),
        'POST /api/settings/password - validation'
      )
    }

    const { new_password } = validation.data

    // Update password via Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    })

    if (updateError) {
      logger.error('Error updating password in auth', updateError, { userId: user.id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to update password'),
        'POST /api/settings/password - update error'
      )
    }

    logger.api('POST', '/api/settings/password', 200, 0, { userId: user.id })

    return NextResponse.json({
      data: { success: true, message: 'Contraseña actualizada correctamente' },
    })
  } catch (error) {
    logger.error('Unexpected error in POST /api/settings/password', error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('An unexpected error occurred'),
      'POST /api/settings/password - catch'
    )
  }
}
