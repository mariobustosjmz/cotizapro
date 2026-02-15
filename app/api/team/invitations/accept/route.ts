import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
})

/**
 * POST /api/team/invitations/accept
 * Accept an invitation using a token
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = acceptInvitationSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      }, { status: 400 })
    }

    const { token } = validation.data

    // Check if user already has a profile (is already in an organization)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({
        error: 'Ya perteneces a una organización'
      }, { status: 400 })
    }

    // Call the database function to accept the invitation
    const { data, error } = await supabase.rpc('accept_invitation', {
      invitation_token: token
    })

    if (error) {
      console.error('Error accepting invitation:', error)
      if (error.message.includes('Invalid or expired')) {
        return NextResponse.json({
          error: 'Invitación inválida o expirada'
        }, { status: 400 })
      }
      return NextResponse.json({ error: 'Error al aceptar la invitación' }, { status: 500 })
    }

    // Get the newly created profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, organization_id, role, email')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      profile,
      organization_id: data
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
