import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

const snoozeSchema = z.object({
  snooze_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .or(z.date()),
  days: z.number().int().positive().max(365).optional(), // Alternatively, snooze for N days
})

// POST /api/reminders/[id]/snooze - Snooze reminder
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

    // Parse and validate request body
    const body = await request.json()
    const validation = snoozeSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      }, { status: 400 })
    }

    // Calculate snooze_until date
    let snooze_until: string
    if (validation.data.snooze_until) {
      snooze_until = typeof validation.data.snooze_until === 'string'
        ? validation.data.snooze_until
        : validation.data.snooze_until.toISOString().split('T')[0]
    } else if (validation.data.days) {
      const today = new Date()
      today.setDate(today.getDate() + validation.data.days)
      snooze_until = today.toISOString().split('T')[0]
    } else {
      return NextResponse.json({
        error: 'Debe especificar snooze_until o days'
      }, { status: 400 })
    }

    // Validate that snooze_until is in the future
    const today = new Date().toISOString().split('T')[0]
    if (snooze_until <= today) {
      return NextResponse.json({
        error: 'La fecha de postergación debe ser futura'
      }, { status: 400 })
    }

    // Update reminder to snoozed status
    const { data: reminder, error } = await supabase
      .from('follow_up_reminders')
      .update({
        status: 'snoozed',
        snoozed_until: snooze_until,
      })
      .eq('id', id)
      .select(`
        *,
        client:clients(id, name, email, phone)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Recordatorio no encontrado' }, { status: 404 })
      }
      console.error('Error snoozing reminder:', error)
      return NextResponse.json({ error: 'Error al posponer el recordatorio' }, { status: 500 })
    }

    return NextResponse.json({ reminder })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
