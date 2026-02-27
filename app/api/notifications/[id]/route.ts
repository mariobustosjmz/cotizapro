import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, ApiErrors } from '@/lib/error-handler'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'PATCH /api/notifications/[id]')
    }

    const body = await request.json()

    if (body.type === 'reminder') {
      const { error } = await supabase
        .from('follow_up_reminders')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        return handleApiError(ApiErrors.INTERNAL_ERROR('Failed to update reminder'), 'PATCH /api/notifications/[id]')
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return handleApiError(ApiErrors.INTERNAL_ERROR('Unexpected error'), 'PATCH /api/notifications/[id]')
  }
}
