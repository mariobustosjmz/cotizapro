import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { enforceMonthlyQuoteLimit, enforceSeatLimit, limitExceededResponse } from './enforce-limits'
import { checkMonthlyQuotes, monthStartIso } from './limits'

interface Call {
  readonly table: string
  readonly method: string
  readonly args: readonly unknown[]
}

interface TableResult {
  readonly count?: number
  readonly error?: { message: string } | null
}

interface FakeOptions {
  readonly plan: string | null
  readonly planError?: boolean
  readonly quotes?: TableResult
  readonly profiles?: TableResult
  readonly invitations?: TableResult
}

function fakeClient(options: FakeOptions): { client: SupabaseClient; calls: Call[] } {
  const calls: Call[] = []
  const results: Record<string, TableResult> = {
    quotes: options.quotes ?? { count: 0 },
    profiles: options.profiles ?? { count: 0 },
    invitations: options.invitations ?? { count: 0 },
  }
  const builder = (table: string): unknown => {
    const proxy: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'gte', 'is', 'gt']) {
      proxy[method] = (...args: unknown[]) => {
        calls.push({ table, method, args })
        return proxy
      }
    }
    proxy.single = async () =>
      options.planError
        ? { data: null, error: { message: 'boom' } }
        : { data: options.plan === null ? null : { plan: options.plan }, error: null }
    proxy.then = (resolve: (value: TableResult) => unknown) => resolve({ error: null, ...results[table] })
    return proxy
  }
  return { client: { from: (table: string) => builder(table) } as unknown as SupabaseClient, calls }
}

const untouchable = {
  from: () => {
    throw new Error('no debe consultar la base')
  },
} as unknown as SupabaseClient

const NOW = new Date('2026-10-13T18:00:00Z')

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('con PLAN_LIMITS_ENFORCED apagado (piloto)', () => {
  it('no consulta la base ni bloquea', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'false')
    expect(await enforceMonthlyQuoteLimit(untouchable, 'org-1')).toBeNull()
    expect(await enforceSeatLimit(untouchable, 'org-1')).toBeNull()
  })
})

describe('enforceMonthlyQuoteLimit con el flag encendido', () => {
  it('bloquea la sexta cotización del mes en Gratis y cuenta por organización y mes', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'true')
    const { client, calls } = fakeClient({ plan: 'free', quotes: { count: 5 } })
    const res = await enforceMonthlyQuoteLimit(client, 'org-1', NOW)
    expect(res?.status).toBe(402)
    const quoteCalls = calls.filter((c) => c.table === 'quotes')
    expect(quoteCalls).toContainEqual({ table: 'quotes', method: 'eq', args: ['organization_id', 'org-1'] })
    expect(quoteCalls).toContainEqual({ table: 'quotes', method: 'gte', args: ['created_at', monthStartIso(NOW)] })
  })

  it('no bloquea a un plan pagado', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'true')
    const { client } = fakeClient({ plan: 'starter', quotes: { count: 500 } })
    expect(await enforceMonthlyQuoteLimit(client, 'org-1')).toBeNull()
  })

  it('falla abierto si el conteo da error', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'true')
    const { client } = fakeClient({ plan: 'free', quotes: { count: 99, error: { message: 'x' } } })
    expect(await enforceMonthlyQuoteLimit(client, 'org-1', NOW)).toBeNull()
  })

  it('falla abierto si no se puede leer el plan', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'true')
    const { client } = fakeClient({ plan: 'free', planError: true, quotes: { count: 99 } })
    expect(await enforceMonthlyQuoteLimit(client, 'org-1', NOW)).toBeNull()
  })
})

describe('enforceSeatLimit con el flag encendido', () => {
  it('bloquea en Gratis cuando el equipo llena el lugar incluido', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'true')
    const { client } = fakeClient({ plan: 'free', profiles: { count: 1 } })
    expect((await enforceSeatLimit(client, 'org-1', NOW))?.status).toBe(402)
  })

  it('bloquea en Starter y cuenta las invitaciones pendientes', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'true')
    const { client, calls } = fakeClient({ plan: 'starter', profiles: { count: 0 }, invitations: { count: 1 } })
    expect((await enforceSeatLimit(client, 'org-1', NOW))?.status).toBe(402)
    const invitationCalls = calls.filter((c) => c.table === 'invitations')
    expect(invitationCalls).toContainEqual({ table: 'invitations', method: 'eq', args: ['organization_id', 'org-1'] })
    expect(invitationCalls).toContainEqual({ table: 'invitations', method: 'is', args: ['accepted_at', null] })
    expect(invitationCalls).toContainEqual({ table: 'invitations', method: 'gt', args: ['expires_at', NOW.toISOString()] })
    expect(calls).toContainEqual({ table: 'profiles', method: 'eq', args: ['organization_id', 'org-1'] })
  })

  it('permite invitar en Pro', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'true')
    const { client } = fakeClient({ plan: 'pro', profiles: { count: 5 }, invitations: { count: 3 } })
    expect(await enforceSeatLimit(client, 'org-1', NOW)).toBeNull()
  })

  it('trata un plan desconocido como Gratis', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'true')
    const { client } = fakeClient({ plan: 'legacy', profiles: { count: 1 } })
    expect((await enforceSeatLimit(client, 'org-1', NOW))?.status).toBe(402)
  })

  it('falla abierto si un conteo da error', async () => {
    vi.stubEnv('PLAN_LIMITS_ENFORCED', 'true')
    const { client } = fakeClient({ plan: 'free', profiles: { count: 9 }, invitations: { error: { message: 'x' } } })
    expect(await enforceSeatLimit(client, 'org-1', NOW)).toBeNull()
  })
})

describe('limitExceededResponse', () => {
  it('responde 402 con código, mensaje y plan sugerido', async () => {
    const check = checkMonthlyQuotes('free', 5)
    if (check.allowed) throw new Error('debió bloquear')
    const res = limitExceededResponse(check)
    expect(res.status).toBe(402)
    expect(await res.json()).toEqual({ error: check.message, code: 'MONTHLY_QUOTES', upgrade_to: 'starter' })
  })
})
