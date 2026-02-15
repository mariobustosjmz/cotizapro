import { createServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { defaultApiLimiter, applyRateLimit } from '@/lib/rate-limit'

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
})

/**
 * PATCH /api/team/members/[id]
 * Update member role
 */
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

    // Only admins and owners can update member roles
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    // Cannot modify yourself
    if (id === user.id) {
      return NextResponse.json({
        error: 'No puedes modificar tu propio rol'
      }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = updateMemberSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.error.issues,
      }, { status: 400 })
    }

    // Get target member
    const { data: targetMember } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', id)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
    }

    // Verify same organization
    if (targetMember.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
    }

    // Cannot change owner role
    if (targetMember.role === 'owner') {
      return NextResponse.json({
        error: 'No puedes cambiar el rol del propietario'
      }, { status: 400 })
    }

    // Only owner can promote to admin
    if (validation.data.role === 'admin' && profile.role !== 'owner') {
      return NextResponse.json({
        error: 'Solo el propietario puede promover a administrador'
      }, { status: 403 })
    }

    // Update member role
    const { data: member, error } = await supabase
      .from('profiles')
      .update({ role: validation.data.role })
      .eq('id', id)
      .select('id, email, full_name, role, avatar_url, created_at')
      .single()

    if (error) {
      console.error('Error updating member:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ member })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/**
 * DELETE /api/team/members/[id]
 * Remove member from organization
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

    // Only admins and owners can remove members
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 })
    }

    // Cannot remove yourself
    if (id === user.id) {
      return NextResponse.json({
        error: 'No puedes eliminarte a ti mismo'
      }, { status: 400 })
    }

    // Get target member
    const { data: targetMember } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', id)
      .single()

    if (!targetMember) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
    }

    // Verify same organization
    if (targetMember.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
    }

    // Cannot remove owner
    if (targetMember.role === 'owner') {
      return NextResponse.json({
        error: 'No puedes eliminar al propietario'
      }, { status: 400 })
    }

    // Delete member profile (this will cascade to auth.users via ON DELETE CASCADE)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error removing member:', error)
      return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
