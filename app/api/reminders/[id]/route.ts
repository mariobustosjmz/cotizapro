import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateReminderSchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

// GET /api/reminders/[id] - Get single reminder
export async function GET(
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
    console.log('[API /reminders/[id] GET] Fetching reminder:', id)
    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[API /reminders/[id] GET] Auth check:', { userId: user?.id, hasError: !!authError })
    if (authError || !user) {
      console.log('[API /reminders/[id] GET] Unauthorized')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Fetch reminder without join (split queries to avoid RLS issues)
    const { data: reminder, error } = await supabase
      .from('follow_up_reminders')
      .select('*')
      .eq('id', id)
      .single()

    console.log('[API /reminders/[id] GET] Query result:', { found: !!reminder, error: error?.message })
    if (error || !reminder) {
      console.log('[API /reminders/[id] GET] Reminder not found')
      return NextResponse.json({ error: 'Recordatorio no encontrado' }, { status: 404 })
    }

    // Fetch client separately
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', reminder.client_id)
      .single()

    // Fetch related quote if exists
    let relatedQuote = null
    if (reminder.related_quote_id) {
      const { data: quote } = await supabase
        .from('quotes')
        .select('id, quote_number, total, status')
        .eq('id', reminder.related_quote_id)
        .single()
      relatedQuote = quote
    }

    // Map data to reminder
    const reminderWithRelations = {
      ...reminder,
      clients: client,
      related_quote: relatedQuote
    }

    console.log('[API /reminders/[id] GET] Returning reminder:', reminderWithRelations.id, reminderWithRelations.title)
    return NextResponse.json({ data: reminderWithRelations })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PATCH /api/reminders/[id] - Update reminder
export async function PATCH(
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

    // Parse and validate request body
    const body = await request.json()
    const validation = updateReminderSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      }, { status: 400 })
    }

    // Validate recurrence if being updated
    if (validation.data.is_recurring !== undefined) {
      if (validation.data.is_recurring && !validation.data.recurrence_interval_months) {
        // Fetch current reminder to check if it already has recurrence_interval_months
        const { data: currentReminder } = await supabase
          .from('follow_up_reminders')
          .select('recurrence_interval_months')
          .eq('id', id)
          .single()

        if (!currentReminder?.recurrence_interval_months) {
          return NextResponse.json({
            error: 'Para recordatorios recurrentes, debe especificar recurrence_interval_months'
          }, { status: 400 })
        }
      }
    }

    // Update reminder without join (split queries to avoid RLS issues)
    const { data: reminder, error } = await supabase
      .from('follow_up_reminders')
      .update(validation.data)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Recordatorio no encontrado' }, { status: 404 })
      }
      console.error('Error updating reminder:', error)
      return NextResponse.json({ error: 'Error al actualizar el recordatorio' }, { status: 500 })
    }

    // Fetch client separately
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, email, phone, whatsapp_phone')
      .eq('id', reminder.client_id)
      .single()

    // Map client data to reminder
    const reminderWithClient = {
      ...reminder,
      clients: client
    }

    return NextResponse.json({ data: reminderWithClient })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE /api/reminders/[id] - Delete reminder
export async function DELETE(
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

    // Delete reminder (RLS will enforce organization filter)
    const { error } = await supabase
      .from('follow_up_reminders')
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Recordatorio no encontrado' }, { status: 404 })
      }
      console.error('Error deleting reminder:', error)
      return NextResponse.json({ error: 'Error al eliminar el recordatorio' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
