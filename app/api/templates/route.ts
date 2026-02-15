import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { quoteItemSchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

const createTemplateSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200),
  description: z.string().max(1000).optional(),
  default_items: z.array(quoteItemSchema).min(1, 'Debe agregar al menos un item').max(50),
  default_notes: z.string().max(2000).optional().nullable(),
  default_terms_and_conditions: z.string().max(5000).optional().nullable(),
  default_discount_rate: z.number().min(0).max(100).default(0),
  default_valid_days: z.number().int().min(1).max(365).default(30),
  category: z.string().max(50).optional().nullable(),
})

// GET /api/templates - List quote templates
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

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

    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const active_only = searchParams.get('active') === 'true'

    let query = supabase
      .from('quote_templates')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('usage_count', { ascending: false })
      .order('name')
      .limit(500)

    if (category) {
      query = query.eq('category', category)
    }

    if (active_only) {
      query = query.eq('is_active', true)
    }

    const { data: templates, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Templates fetch error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/templates - Create template
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

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

    const body = await request.json()
    const validation = createTemplateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      }, { status: 400 })
    }

    const { data: template, error } = await supabase
      .from('quote_templates')
      .insert({
        ...validation.data,
        organization_id: profile.organization_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
