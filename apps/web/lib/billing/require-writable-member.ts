import { requireMember, type MemberResult, type MemberRole } from '@/lib/auth/require-member'
import { assertWritable } from './writable'

/** requireMember() más el bloqueo de solo lectura por plan vencido (402). */
export async function requireWritableMember(allowed?: readonly MemberRole[]): Promise<MemberResult> {
  const auth = await requireMember(allowed)
  if (!auth.ok) return auth
  const blocked = await assertWritable(auth.ctx.supabase)
  return blocked ? { ok: false, response: blocked } : auth
}
