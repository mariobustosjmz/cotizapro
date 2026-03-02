import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'
import type { EntityType } from '@/types/custom-fields'

const entityTypeEnum = z.enum(['client', 'service', 'quote'])

const createFieldSchema = z.object({
  entity_type: entityTypeEnum,
  field_key: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, 'field_key must be lowercase letters, numbers, and underscores'),
  field_label: z.string().min(1).max(200),
  field_type: z.enum(['text', 'textarea', 'number', 'date', 'select', 'checkbox', 'url', 'phone', 'email']),
  is_required: z.boolean().default(false),
  is_active: z.boolean().default(true),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional().nullable(),
  placeholder: z.string().max(500).optional().nullable(),
  default_value: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).default(0),
})

// GET /api/custom-fields?entity_type=client
export async function GET(request: NextRequest) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) return applyRateLimit(limitResult)

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

    const entityTypeParam = request.nextUrl.searchParams.get('entity_type') as EntityType | null
    const activeOnly = request.nextUrl.searchParams.get('active_only') !== 'false'

    let query = supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('sort_order')
      .order('created_at')

    if (entityTypeParam) {
      const parsed = entityTypeEnum.safeParse(entityTypeParam)
      if (!parsed.success) {
        return NextResponse.json({ error: 'entity_type inválido' }, { status: 400 })
      }
      query = query.eq('entity_type', parsed.data)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: fields, error } = await query

    if (error) {
      console.error('Error fetching custom fields:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: fields })
  } catch (error) {
    console.error('Unexpected error in GET /api/custom-fields:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/custom-fields — admin only
export async function POST(request: NextRequest) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) return applyRateLimit(limitResult)

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

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({
        error: 'Permisos insuficientes. Solo administradores pueden gestionar campos personalizados.'
      }, { status: 403 })
    }

    const body = await request.json()
    const validation = createFieldSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validación fallida',
        details: validation.error.issues,
      }, { status: 400 })
    }

    const { data: field, error } = await supabase
      .from('custom_field_definitions')
      .insert({
        ...validation.data,
        organization_id: profile.organization_id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({
          error: 'Ya existe un campo con ese identificador para este tipo de entidad.'
        }, { status: 409 })
      }
      console.error('Error creating custom field:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: field }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/custom-fields:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
