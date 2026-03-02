import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, ApiErrors } from '@/lib/error-handler'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return handleApiError(ApiErrors.UNAUTHORIZED(), 'GET /api/quotes/[id]/notifications')
    }

    const { data, error } = await supabase
      .from('quote_notifications')
      .select('id, notification_type, recipient, status, sent_at, delivered_at')
      .eq('quote_id', id)
      .order('sent_at', { ascending: false })
      .limit(20)

    if (error) {
      return handleApiError(ApiErrors.INTERNAL_ERROR('Failed to fetch notifications'), 'GET /api/quotes/[id]/notifications')
    }

    return NextResponse.json({ data })
  } catch {
    return handleApiError(ApiErrors.INTERNAL_ERROR('Unexpected error'), 'GET /api/quotes/[id]/notifications')
  }
}
