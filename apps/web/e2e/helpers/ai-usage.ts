import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), quiet: true })

export const MEGAGLASS_ORG_ID = '00000000-0000-0000-00c0-000000000001'
export const MEGAGLASS_OWNER = 'direccion@megaglass.demo.cotizapro.mx'
export const MEGAGLASS_MEMBER = 'instalador@megaglass.demo.cotizapro.mx'

const LOCAL_SUPABASE_HOSTS: readonly string[] = ['127.0.0.1', 'localhost']

/** Service role solo para preparar datos en la base local; se niega a operar contra cualquier otro host. */
export function aiAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  if (!LOCAL_SUPABASE_HOSTS.includes(new URL(url).hostname)) {
    throw new Error(`Los helpers de IA solo operan sobre Supabase local; se recibió ${url}`)
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Deja la empresa sin uso de IA en el periodo (solo base local de pruebas). */
export async function resetAiUsage(orgId: string): Promise<void> {
  const db = aiAdmin()
  const results = await Promise.all([
    db.from('ai_usage_events').delete().eq('organization_id', orgId),
    db.from('ai_credit_grants').delete().eq('organization_id', orgId),
    db.from('ai_usage_alerts').delete().eq('organization_id', orgId),
  ])
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(`resetAiUsage: ${failed.error.message}`)
}

export async function userIdByEmail(email: string): Promise<string> {
  const { data, error } = await aiAdmin().from('profiles').select('id').eq('email', email).single()
  if (error || !data) throw new Error(`Usuario demo no encontrado: ${email}`)
  return String(data.id)
}

/** Registra uso a nombre de otro miembro para no tocar el tope diario del usuario que corre la prueba. */
export async function fillAiUsage(orgId: string, credits: number, memberEmail: string = MEGAGLASS_MEMBER): Promise<void> {
  const userId = await userIdByEmail(memberEmail)
  const { error } = await aiAdmin()
    .from('ai_usage_events')
    .insert({ organization_id: orgId, user_id: userId, feature: 'rewrite', credits, status: 'ok', finished_at: new Date().toISOString() })
  if (error) throw new Error(`fillAiUsage: ${error.message}`)
}
