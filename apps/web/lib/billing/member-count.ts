import type { SupabaseClient } from '@supabase/supabase-js'

/** Usuarios de la organización de quien llama (función SECURITY DEFINER; ver migración 035). */
export async function countOrganizationMembers(supabase: SupabaseClient): Promise<number | null> {
  const { data, error } = await supabase.rpc('organization_member_count')
  if (error || typeof data !== 'number') return null
  return data
}
