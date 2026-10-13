import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { applyRateLimit, strictAuthLimiter } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { INVITE_TOKEN_PATTERN, invitationRpcError } from '@/lib/team/invitation-errors'

const acceptInvitationSchema = z.object({
  token: z.string().regex(INVITE_TOKEN_PATTERN, 'Token inválido'),
})

/** POST /api/team/invitations/accept: la RPC exige sesión, correo invitado y que no tenga ya organización. */
export async function POST(request: NextRequest) {
  const limited = strictAuthLimiter(request)
  if (limited.limited) return applyRateLimit(limited)

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Inicia sesión para aceptar la invitación' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const validation = acceptInvitationSchema.safeParse(body)
  if (!validation.success) return NextResponse.json({ error: 'Invitación inválida o expirada' }, { status: 400 })

  const { data, error } = await supabase.rpc('accept_invitation', { invitation_token: validation.data.token })
  if (error) {
    const mapped = invitationRpcError(error.message)
    if (mapped.status === 500) logger.error('accept_invitation failed', error, { userId: user.id })
    return NextResponse.json({ error: mapped.error }, { status: mapped.status })
  }
  return NextResponse.json({ success: true, organization_id: data })
}
