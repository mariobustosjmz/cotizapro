import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })

export const DON_BETO_ORG = '00000000-0000-0000-00c0-000000000003'
export const DON_BETO_OWNER = 'beto@plomeria.demo.cotizapro.mx'
export const SUPERADMIN_EMAIL = 'direccion@megaglass.demo.cotizapro.mx'
export const NON_ADMIN_EMAIL = 'hector@voltaje.demo.cotizapro.mx'
export const E2E_REFERENCE_PREFIX = 'MP-E2E-'

type E2ePlan = 'free' | 'starter' | 'pro' | 'enterprise'

const LOCAL_SUPABASE_HOSTS: readonly string[] = ['127.0.0.1', 'localhost']

/** Service role solo para preparar datos de prueba en la base local; la app nunca la usa en rutas de usuario. */
function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  if (!LOCAL_SUPABASE_HOSTS.includes(new URL(url).hostname)) {
    throw new Error(`Los helpers de cobro solo operan sobre Supabase local; se recibió ${url}`)
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function userIdByEmail(db: SupabaseClient, email: string): Promise<string> {
  const { data, error } = await db.from('profiles').select('id').eq('email', email).single()
  if (error || !data) throw new Error(`No existe el perfil demo ${email}: ${error?.message ?? 'sin fila'}`)
  return (data as { id: string }).id
}

export async function grantPlatformAdmin(email: string): Promise<void> {
  const db = serviceClient()
  const { error } = await db.from('platform_admins').upsert({ user_id: await userIdByEmail(db, email) })
  if (error) throw new Error(`No se pudo dar superadmin: ${error.message}`)
}

export async function revokePlatformAdmin(email: string): Promise<void> {
  const db = serviceClient()
  const { error } = await db.from('platform_admins').delete().eq('user_id', await userIdByEmail(db, email))
  if (error) throw new Error(`No se pudo quitar superadmin: ${error.message}`)
}

export async function setBillingPeriod(orgId: string, plan: E2ePlan, periodEnd: Date | null): Promise<void> {
  const { error } = await serviceClient()
    .from('organizations')
    .update({ plan, subscription_status: 'active', current_period_end: periodEnd ? periodEnd.toISOString() : null })
    .eq('id', orgId)
  if (error) throw new Error(`No se pudo ajustar el periodo: ${error.message}`)
}

export async function restoreDonBeto(): Promise<void> {
  const db = serviceClient()
  const { error } = await db
    .from('organizations')
    .update({ plan: 'pro', subscription_status: 'active', current_period_end: null, billing_provider: null, billing_reference: null })
    .eq('id', DON_BETO_ORG)
  if (error) throw new Error(`No se pudo restaurar a Don Beto: ${error.message}`)
  await db.from('plan_activations').delete().eq('organization_id', DON_BETO_ORG).like('reference', `${E2E_REFERENCE_PREFIX}%`)
}
