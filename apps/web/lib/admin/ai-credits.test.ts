import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { adminGrantBodySchema, formatResetDateLong, aiGrantError, getAdminAiUsage, grantAiCredits } from './ai-credits'

const SUMMARY = {
  used: 10, allowance: 400, pack_credits: 200, remaining: 590, percent: 2, resets_on: '2026-11-01', enforced: true,
  by_feature: [], packs: [{ credits: 200, source: 'pack', expires_at: '2026-11-01T06:00:00Z' }],
}

function fakeDb(result: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(result)
  return { db: { rpc } as unknown as SupabaseClient, rpc }
}

describe('créditos de IA desde /admin', () => {
  it('valida el cuerpo sin la empresa (va en la ruta)', () => {
    expect(adminGrantBodySchema.safeParse({ credits: 200, source: 'pack', reference: 'MP-123' }).success).toBe(true)
    expect(adminGrantBodySchema.safeParse({ credits: 100000, source: 'courtesy' }).success).toBe(true)
    expect(adminGrantBodySchema.safeParse({ credits: 200, source: 'courtesy', reference: '' }).success).toBe(true)
    expect(adminGrantBodySchema.safeParse({ credits: 0, source: 'pack' }).success).toBe(false)
    expect(adminGrantBodySchema.safeParse({ credits: 100001, source: 'pack' }).success).toBe(false)
    expect(adminGrantBodySchema.safeParse({ credits: 1.5, source: 'pack' }).success).toBe(false)
    expect(adminGrantBodySchema.safeParse({ credits: 200, source: 'regalo' }).success).toBe(false)
    expect(adminGrantBodySchema.safeParse({ credits: 200, source: 'pack', reference: 'x'.repeat(201) }).success).toBe(false)
  })

  it('exige la referencia del pago en paquetes y no en cortesías', () => {
    for (const reference of [undefined, '', '   ']) {
      const r = adminGrantBodySchema.safeParse({ credits: 200, source: 'pack', reference })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.flatten().fieldErrors.reference).toEqual(['Escribe la referencia del pago'])
    }
  })

  it('traduce los errores de la RPC', () => {
    expect(aiGrantError('organization_not_found')).toEqual({ status: 404, error: 'Empresa no encontrada' })
    expect(aiGrantError('forbidden')).toEqual({ status: 404, error: 'No encontrado' })
    expect(aiGrantError('ai_invalid_credits')).toEqual({ status: 400, error: 'Cantidad de créditos no válida' })
    expect(aiGrantError('ai_invalid_source')).toEqual({ status: 400, error: 'Origen no válido' })
    expect(aiGrantError('ai_invalid_reference')).toEqual({ status: 400, error: 'La referencia admite máximo 200 caracteres' })
    expect(aiGrantError('ai_duplicate_reference')).toEqual({ status: 409, error: 'Ese pago ya se acreditó' })
    expect(aiGrantError('otro')).toEqual({ status: 500, error: 'No se pudieron agregar los créditos' })
    expect(aiGrantError('constructor')).toEqual({ status: 500, error: 'No se pudieron agregar los créditos' })
  })

  it('da formato es-MX a la fecha de reinicio', () => {
    expect(formatResetDateLong('2026-11-01')).toBe('1 de noviembre de 2026')
  })

  it('lee el uso por RPC y valida su forma', async () => {
    const { db, rpc } = fakeDb({ data: SUMMARY, error: null })
    const result = await getAdminAiUsage(db, 'org-1')
    expect(rpc).toHaveBeenCalledWith('admin_ai_usage', { p_org: 'org-1' })
    expect(result).toEqual({ ok: true, data: SUMMARY })
    const bad = await getAdminAiUsage(fakeDb({ data: { used: 'x' }, error: null }).db, 'org-1')
    expect(bad).toEqual({ ok: false, failure: { status: 500, error: 'No se pudieron agregar los créditos' } })
  })

  it('agrega créditos por RPC con referencia nula si no hay', async () => {
    const { db, rpc } = fakeDb({ data: 'grant-1', error: null })
    const result = await grantAiCredits(db, 'org-1', { credits: 200, source: 'courtesy' })
    expect(rpc).toHaveBeenCalledWith('admin_grant_ai_credits', { p_org: 'org-1', p_credits: 200, p_source: 'courtesy', p_reference: null })
    expect(result).toEqual({ ok: true, data: { grantId: 'grant-1' } })
  })

  it('mapea el error de la RPC sin exponer detalle interno', async () => {
    const result = await grantAiCredits(fakeDb({ data: null, error: { message: 'organization_not_found' } }).db, 'o', { credits: 1, source: 'courtesy' })
    expect(result).toEqual({ ok: false, failure: { status: 404, error: 'Empresa no encontrada' } })
    const generic = await grantAiCredits(fakeDb({ data: null, error: { message: 'connection reset by peer' } }).db, 'o', { credits: 1, source: 'courtesy' })
    expect(JSON.stringify(generic)).not.toContain('connection')
  })
})
