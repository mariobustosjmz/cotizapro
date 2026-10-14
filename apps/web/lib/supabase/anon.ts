import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente anónimo sin sesión ni cabeceras del request. Para rutas de servidor que se autentican
 * ante la base con su propia credencial (cron); createServerClient() reenviaría el Bearer del cron como JWT.
 */
export function createAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Supabase anon client is not configured')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
