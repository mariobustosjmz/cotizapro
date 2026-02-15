import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

// GET /api/reminders/due - Get due reminders using SQL function
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Get days_ahead parameter (default: 7 days)
    const searchParams = request.nextUrl.searchParams
    const days_ahead = parseInt(searchParams.get('days_ahead') || '7')

    // Validate days_ahead
    if (days_ahead < 0 || days_ahead > 365) {
      return NextResponse.json({
        error: 'days_ahead debe estar entre 0 y 365'
      }, { status: 400 })
    }

    // Call SQL function to get due reminders
    const { data: dueReminders, error } = await supabase
      .rpc('get_due_reminders', {
        org_id: profile.organization_id,
        days_ahead: days_ahead,
      })

    if (error) {
      console.error('Error fetching due reminders:', error)
      return NextResponse.json({ error: 'Error al obtener recordatorios pendientes' }, { status: 500 })
    }

    return NextResponse.json({
      reminders: dueReminders,
      days_ahead,
      total: dueReminders?.length || 0,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
