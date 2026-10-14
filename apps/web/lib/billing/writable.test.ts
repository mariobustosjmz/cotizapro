import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import { PLAN_EXPIRED_CODE, assertWritable } from './writable'

function fakeClient(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result)
  return { client: { rpc } as unknown as SupabaseClient, rpc }
}

describe('assertWritable', () => {
  it('deja pasar cuando la organización puede escribir', async () => {
    const { client, rpc } = fakeClient({ data: true, error: null })
    expect(await assertWritable(client)).toBeNull()
    expect(rpc).toHaveBeenCalledWith('current_org_is_writable')
  })

  it('responde 402 en español cuando el plan venció', async () => {
    const { client } = fakeClient({ data: false, error: null })
    const res = await assertWritable(client)
    if (!res) throw new Error('se esperaba una respuesta 402')
    expect(res.status).toBe(402)
    const body: { error: string; code: string } = await res.json()
    expect(body.code).toBe(PLAN_EXPIRED_CODE)
    expect(body.error).toContain('solo lectura')
  })

  it('falla abierta si la consulta del plan falla', async () => {
    const logged = vi.spyOn(logger, 'error').mockImplementation(() => undefined)
    const { client } = fakeClient({ data: null, error: { message: 'boom' } })
    expect(await assertWritable(client)).toBeNull()
    expect(logged).toHaveBeenCalledWith('current_org_is_writable failed', { message: 'boom' })
    logged.mockRestore()
  })
})
