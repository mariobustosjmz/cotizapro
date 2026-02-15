import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

/**
 * DELETE /api/team/invitations/[id]
 * Cancel/delete an invitation
 */
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

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Only admins and owners can delete invitations
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    // Delete invitation (RLS will enforce organization filter)
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
      }
      console.error('Error deleting invitation:', error)
      return NextResponse.json({ error: 'Error al eliminar la invitación' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
