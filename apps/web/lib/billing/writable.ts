import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

export const PLAN_EXPIRED_CODE = 'PLAN_EXPIRED'
export const PLAN_EXPIRED_MESSAGE =
  'Tu plan venció y la cuenta está en solo lectura. Renueva en Facturación para volver a crear, editar o enviar.'

export function planExpiredResponse(): NextResponse {
  return NextResponse.json({ error: PLAN_EXPIRED_MESSAGE, code: PLAN_EXPIRED_CODE }, { status: 402 })
}

/** null si la organización de quien llama puede escribir; si su plan venció, la respuesta 402 lista para regresar. */
export async function assertWritable(supabase: SupabaseClient): Promise<NextResponse | null> {
  const { data, error } = await supabase.rpc('current_org_is_writable')
  if (error) {
    // Falla abierta: el bloqueo es de cobro, no de seguridad; un error de lectura no debe frenar a un cliente al corriente.
    logger.error('current_org_is_writable failed', error)
    return null
  }
  return data === false ? planExpiredResponse() : null
}
