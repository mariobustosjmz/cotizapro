import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/auth/organization
 * Fetch current user's organization details (for loading in forms)
 */
export async function GET(request: NextRequest) {
  try {
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

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('id, name, slug, settings')
      .eq('id', profile.organization_id)
      .single()

    if (error || !organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ data: organization })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
