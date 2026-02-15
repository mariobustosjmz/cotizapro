import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import { handleApiError, ApiErrors } from '@/lib/error-handler'
import { logger } from '@/lib/logger'

/**
 * GET /api/team/members
 * List all members in the user's organization
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      logger.warn('Rate limit exceeded for team members list', { ip: request.headers.get('x-forwarded-for') })
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logger.security('GET /api/team/members - unauthorized access attempt')
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/team/members')
    }

    // Get user's profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      logger.warn('Profile not found for authenticated user', { userId: user.id })
      return handleApiError(ApiErrors.NOT_FOUND('Profile'), 'GET /api/team/members')
    }

    // Fetch all members in the organization (RLS will enforce filter)
    const { data: members, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, avatar_url, created_at')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      logger.error('Error fetching team members from database', error, { orgId: profile.organization_id })
      return handleApiError(
        ApiErrors.INTERNAL_ERROR('Failed to fetch team members'),
        'GET /api/team/members - query error'
      )
    }

    logger.api('GET', '/api/team/members', 200, 0, { count: members?.length || 0, userId: user.id })

    return NextResponse.json({ members })
  } catch (error) {
    logger.error('Unexpected error in GET /api/team/members', error as Error)
    return handleApiError(
      ApiErrors.INTERNAL_ERROR('Failed to process request'),
      'GET /api/team/members - unhandled exception'
    )
  }
}
