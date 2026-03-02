import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/integrations/email'
import { encode as escapeHtml } from 'html-entities'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'member', 'viewer']),
})

/**
 * GET /api/team/invitations
 * List all invitations for the user's organization
 */
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get user's profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Only admins and owners can view invitations
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    // Fetch invitations (RLS will enforce organization filter)
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('id, email, role, expires_at, accepted_at, created_at')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * POST /api/team/invitations
 * Create a new team invitation
 */
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const limitResult = defaultApiLimiter(request)
    if (limitResult.limited) {
      return applyRateLimit(limitResult)
    }

    const supabase = await createServerClient()

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Get user's profile and organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Only admins and owners can invite
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = inviteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      }, { status: 400 })
    }

    const { email, role } = validation.data

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('email', email)
      .single()

    if (existingMember) {
      return NextResponse.json({
        error: 'Este usuario ya es miembro de la organización'
      }, { status: 400 })
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('email', email)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvitation) {
      return NextResponse.json({
        error: 'Ya existe una invitación pendiente para este email'
      }, { status: 400 })
    }

    // Create invitation (RLS will enforce organization_id)
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        organization_id: profile.organization_id,
        email,
        role,
        invited_by: user.id,
      })
      .select('id, email, role, token, expires_at')
      .single()

    if (error) {
      console.error('Error creating invitation:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    // Get organization name for email
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single()

    // Send invitation email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${appUrl}/invite/${invitation.token}`

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9fafb; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Invitación a CotizaPro</h1>
            </div>
            <div class="content">
              <h2>Hola,</h2>
              <p>Has sido invitado a unirte a <strong>${escapeHtml(organization?.name || 'una organización')}</strong> en CotizaPro como <strong>${escapeHtml(role)}</strong>.</p>
              <p>La invitación expira en 7 días.</p>
              <a href="${inviteUrl}" class="button">Aceptar Invitación</a>
              <p>O copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #666;">${inviteUrl}</p>
            </div>
            <div class="footer">
              <p>Este correo fue generado automáticamente por CotizaPro</p>
            </div>
          </div>
        </body>
      </html>
    `

    await sendEmail({
      to: email,
      subject: `Invitación a unirte a ${escapeHtml(organization?.name || 'CotizaPro')}`,
      html: emailHtml,
    })

    return NextResponse.json({ invitation }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
