import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { billingState, snapshotFromRow } from './expiry'
import { expiryBanner } from './expiry-copy'
import type { ExpiryBanner } from './types'

/** Banner de vencimiento del panel; ante un error de lectura no muestra banner (el aviso de cobro no debe tumbar el panel). */
export async function loadExpiryBanner(
  supabase: SupabaseClient,
  organizationId: string | null,
  now: Date = new Date(),
): Promise<ExpiryBanner | null> {
  if (!organizationId) return null
  const { data, error } = await supabase
    .from('organizations')
    .select('plan, current_period_end')
    .eq('id', organizationId)
    .maybeSingle()
  if (error) {
    logger.error('dashboard billing read failed', error)
    return null
  }
  return expiryBanner(billingState(snapshotFromRow(data), now))
}
