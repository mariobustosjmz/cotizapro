import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'

const createWebhookSchema = z.object({
  url: z.string().url('URL inválida').regex(/^https?:\/\//, 'URL debe comenzar con http:// o https://'),
  event_types: z.array(z.enum([
    'quote.created',
    'quote.updated',
    'quote.sent',
    'quote.viewed',
    'quote.accepted',
    'quote.rejected',
    'quote.expired',
    'client.created',
    'client.updated',
    'client.deleted',
    'reminder.created',
    'reminder.completed',
  ])).min(1, 'Debe seleccionar al menos un tipo de evento'),
  description: z.string().max(500).optional(),
  max_retries: z.number().int().min(0).max(10).default(3),
  retry_delay_seconds: z.number().int().min(30).max(3600).default(60),
})

// GET /api/webhooks - List webhooks
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    const { data: webhooks, error } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ webhooks })
  } catch (error) {
    console.error('Webhooks fetch error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/webhooks - Create webhook
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createWebhookSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      }, { status: 400 })
    }

    // Generate secret key for webhook signing
    const secret_key = crypto.randomBytes(32).toString('hex')

    const { data: webhook, error } = await supabase
      .from('webhook_subscriptions')
      .insert({
        ...validation.data,
        organization_id: profile.organization_id,
        secret_key,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ webhook }, { status: 201 })
  } catch (error) {
    console.error('Webhook creation error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
