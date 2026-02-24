import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

const patchFieldSchema = z.object({
  field_label: z.string().min(1).max(200).optional(),
  is_required: z.boolean().optional(),
  is_active: z.boolean().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional().nullable(),
  placeholder: z.string().max(500).optional().nullable(),
  default_value: z.string().max(500).optional().nullable(),
  sort_order: z.number().int().min(0).optional(),
})

async function getProfile(supabase: Awaited<ReturnType<typeof createServerClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', userId)
    .single()
  return data
}

// GET /api/custom-fields/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) return applyRateLimit(limitResult)

    const { id } = await params

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const profile = await getProfile(supabase, user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    const { data: field, error } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (error || !field) {
      return NextResponse.json({ error: 'Campo no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: field })
  } catch (error) {
    console.error('Unexpected error in GET /api/custom-fields/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PATCH /api/custom-fields/[id] — admin only
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) return applyRateLimit(limitResult)

    const { id } = await params

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const profile = await getProfile(supabase, user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({
        error: 'Permisos insuficientes. Solo administradores pueden gestionar campos personalizados.'
      }, { status: 403 })
    }

    const body = await request.json()
    const validation = patchFieldSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({
        error: 'Validación fallida',
        details: validation.error.issues,
      }, { status: 400 })
    }

    if (Object.keys(validation.data).length === 0) {
      return NextResponse.json({ error: 'Sin cambios para actualizar' }, { status: 400 })
    }

    const { data: field, error } = await supabase
      .from('custom_field_definitions')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error || !field) {
      if (!field) {
        return NextResponse.json({ error: 'Campo no encontrado' }, { status: 404 })
      }
      console.error('Error updating custom field:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: field })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/custom-fields/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE /api/custom-fields/[id] — soft delete (is_active=false), admin only
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) return applyRateLimit(limitResult)

    const { id } = await params

    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const profile = await getProfile(supabase, user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({
        error: 'Permisos insuficientes. Solo administradores pueden gestionar campos personalizados.'
      }, { status: 403 })
    }

    const { data: field, error } = await supabase
      .from('custom_field_definitions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .select()
      .single()

    if (error || !field) {
      return NextResponse.json({ error: 'Campo no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: field })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/custom-fields/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
