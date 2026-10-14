import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, ApiError, ApiErrors } from '@/lib/error-handler'

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
    } else if (body.type === 'send') {
      const { data, error } = await supabase
        .from('quote_notifications')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('id', id)
        .in('notification_type', ['client_accepted', 'client_rejected'])
        .select('id')

      if (error) {
        return handleApiError(ApiErrors.INTERNAL_ERROR('Failed to update notification'), 'PATCH /api/notifications/[id]')
      }
      if (!data || data.length === 0) {
        return handleApiError(new ApiError(404, 'No se encontró la notificación.', 'quote_notification not found or not updatable', 'NOT_FOUND'), 'PATCH /api/notifications/[id]')
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return handleApiError(ApiErrors.INTERNAL_ERROR('Unexpected error'), 'PATCH /api/notifications/[id]')
  }
}
