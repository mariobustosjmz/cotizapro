import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { updateServiceSchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

// GET /api/services/[id] - Obtener servicio individual
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: service, error } = await supabase
      .from('service_catalog')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !service) {
      return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ data: service })
  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PATCH /api/services/[id] - Actualizar servicio (solo admin/owner)
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({
        error: 'Permisos insuficientes. Solo administradores pueden actualizar servicios.'
      }, { status: 403 })
    }

    // Validar datos
    const body = await request.json()
    const validation = updateServiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validación fallida',
        details: validation.error.issues,
      }, { status: 400 })
    }

    // Actualizar servicio
    const { data: service, error } = await supabase
      .from('service_catalog')
      .update(validation.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error al actualizar servicio:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: service })
  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE /api/services/[id] - Eliminar servicio (solo admin/owner)
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

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({
        error: 'Permisos insuficientes. Solo administradores pueden eliminar servicios.'
      }, { status: 403 })
    }

    // Eliminar servicio
    const { error } = await supabase
      .from('service_catalog')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error al eliminar servicio:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: { success: true } })
  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
