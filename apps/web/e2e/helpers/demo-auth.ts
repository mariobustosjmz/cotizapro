import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), quiet: true })

/** Credencial demo local documentada en scripts/seed/README.md; en otros entornos se pasa por env. */
export const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'CotizaDemo-Local-2026'

export async function demoAccessToken(email: string): Promise<string> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD })
  if (error || !data.session) throw new Error(`Login demo falló para ${email}: ${error?.message}`)
  return data.session.access_token
}
