import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente con service role: ignora RLS. Solo para rutas de servidor sin sesión de usuario
 * (webhooks de proveedores) y escrituras de facturación que el trigger bloquea a `authenticated`.
 * Nunca importarlo desde componentes de cliente.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase admin client is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
