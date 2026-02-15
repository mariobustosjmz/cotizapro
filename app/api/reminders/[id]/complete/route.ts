import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

// POST /api/reminders/[id]/complete - Mark reminder as completed
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    const { id } = await params
    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Fetch reminder to check if it's recurring
    const { data: reminder, error: fetchError } = await supabase
      .from('follow_up_reminders')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !reminder) {
      return NextResponse.json({ error: 'Recordatorio no encontrado' }, { status: 404 })
    }

    // Mark as completed
    const { error: updateError } = await supabase
      .from('follow_up_reminders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error completing reminder:', updateError)
      return NextResponse.json({ error: 'Error al completar el recordatorio' }, { status: 500 })
    }

    // If it's recurring, create next occurrence
    let next_reminder_id = null
    if (reminder.is_recurring && reminder.recurrence_interval_months) {
      const { data: nextId, error: nextError } = await supabase
        .rpc('create_next_reminder_occurrence', { reminder_id: id })

      if (nextError) {
        console.error('Error creating next occurrence:', nextError)
        // Don't fail the request, just log the error
      } else {
        next_reminder_id = nextId
      }
    }

    // Fetch updated reminder
    const { data: updatedReminder } = await supabase
      .from('follow_up_reminders')
      .select(`
        *,
        client:clients(id, name, email, phone)
      `)
      .eq('id', id)
      .single()

    return NextResponse.json({
      reminder: updatedReminder,
      next_reminder_id,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
