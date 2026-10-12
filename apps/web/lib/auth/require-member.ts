import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

export interface MemberContext {
  readonly supabase: ServerClient
  readonly userId: string
  readonly organizationId: string
  readonly role: MemberRole
}

export type MemberResult = { readonly ok: true; readonly ctx: MemberContext } | { readonly ok: false; readonly response: NextResponse }

/** Autentica con getUser() y resuelve organización y rol. Opcionalmente exige uno de los roles dados. */
export async function requireMember(allowed?: readonly MemberRole[]): Promise<MemberResult> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()
  if (!profile) return { ok: false, response: NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 }) }

  const role = profile.role as MemberRole
  if (allowed && !allowed.includes(role)) {
    return { ok: false, response: NextResponse.json({ error: 'No tienes permiso para esta acción' }, { status: 403 }) }
  }
  return { ok: true, ctx: { supabase, userId: user.id, organizationId: profile.organization_id as string, role } }
}
