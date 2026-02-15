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
    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Fetch reminder (RLS will enforce organization filter)
    const { data: reminder, error } = await supabase
      .from('follow_up_reminders')
      .select(`
        *,
        client:clients(*),
        related_quote:quotes(id, quote_number, total, status)
      `)
      .eq('id', id)
      .single()

    if (error || !reminder) {
      return NextResponse.json({ error: 'Recordatorio no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ reminder })
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

    // Update reminder (RLS will enforce organization filter)
    const { data: reminder, error } = await supabase
      .from('follow_up_reminders')
      .update(validation.data)
      .eq('id', id)
      .select(`
        *,
        client:clients(id, name, email, phone, whatsapp_phone)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Recordatorio no encontrado' }, { status: 404 })
      }
      console.error('Error updating reminder:', error)
      return NextResponse.json({ error: 'Error al actualizar el recordatorio' }, { status: 500 })
    }

    return NextResponse.json({ reminder })
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
