import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSchema } from '@/lib/validations/cotizapro'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

// GET /api/services - Lista de servicios con filtros
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

    // Obtener organización del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Parámetros de consulta
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const active_only = searchParams.get('active') === 'true'

    // Construir query
    let query = supabase
      .from('service_catalog')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('category')
      .order('name')
      .limit(1000)

    if (category) {
      query = query.eq('category', category)
    }

    if (active_only) {
      query = query.eq('is_active', true)
    }

    const { data: services, error } = await query

    if (error) {
      console.error('Error al obtener servicios:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: services })
  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST /api/services - Crear servicio (solo admin/owner)
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

    // Obtener perfil con role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Verificar permisos (solo owner o admin)
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({
        error: 'Permisos insuficientes. Solo administradores pueden crear servicios.'
      }, { status: 403 })
    }

    // Validar datos
    const body = await request.json()
    const validation = createServiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Validación fallida',
        details: validation.error.issues,
      }, { status: 400 })
    }

    // Insertar servicio
    const { data: service, error } = await supabase
      .from('service_catalog')
      .insert({
        ...validation.data,
        organization_id: profile.organization_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear servicio:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ data: service }, { status: 201 })
  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
