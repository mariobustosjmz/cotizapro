import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/logger'
import { fakeDb } from './testing/fake-db'
import { RESERVATION_FIXTURE, SUMMARY_FIXTURE } from './testing/fixtures'
import { claimUsageAlert, finishUsage, getUsageSummary, reserveCredits, type AiDb } from './usage'

afterEach(() => vi.restoreAllMocks())

const RESERVATION = { eventId: 'e', nonce: 'n', feature: 'rewrite' } as const
const NO_USAGE = { promptTokens: null, completionTokens: null } as const

describe('reserveCredits', () => {
  it('reserva los créditos de la función', async () => {
    const fake = fakeDb({ ai_reserve: () => ({ data: RESERVATION_FIXTURE, error: null }) })
    const reservation = await reserveCredits(fake.db, 'whatsapp_draft')
    expect(reservation).toEqual({ eventId: RESERVATION_FIXTURE[0].event_id, nonce: RESERVATION_FIXTURE[0].nonce, feature: 'whatsapp_draft' })
    expect(fake.calls[0]).toEqual({ fn: 'ai_reserve', args: { p_feature: 'whatsapp_draft', p_credits: 3 } })
  })

  it('traduce el error de cupo', async () => {
    const fake = fakeDb({ ai_reserve: () => ({ data: null, error: { message: 'ai_quota_exceeded' } }) })
    await expect(reserveCredits(fake.db, 'rewrite')).rejects.toMatchObject({ code: 'quota_exceeded' })
  })

  it('un error desconocido de la base es unavailable', async () => {
    await expect(reserveCredits(fakeDb({ ai_reserve: () => ({ data: null, error: { message: 'boom' } }) }).db, 'rewrite')).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('una respuesta vacía o malformada es un AiError', async () => {
    for (const data of [[], [{ event_id: 'x' }], null]) {
      await expect(reserveCredits(fakeDb({ ai_reserve: () => ({ data, error: null }) }).db, 'rewrite')).rejects.toMatchObject({ name: 'AiError', code: 'unavailable' })
    }
  })
})

describe('finishUsage', () => {
  it('manda solo metadatos y nunca lanza', async () => {
    const fake = fakeDb({ ai_finish: () => ({ data: null, error: { message: 'ai_event_not_open' } }) })
    await finishUsage(fake.db, RESERVATION, { ok: false, usage: { promptTokens: null, completionTokens: 3 }, latencyMs: 812.6 })
    expect(fake.calls[0]?.args).toEqual({ p_event: 'e', p_nonce: 'n', p_ok: false, p_prompt_tokens: null, p_completion_tokens: 3, p_latency_ms: 813 })
  })

  it('con ok:true manda p_ok true y los tokens', async () => {
    const fake = fakeDb({})
    await finishUsage(fake.db, RESERVATION, { ok: true, usage: { promptTokens: 5, completionTokens: 7 }, latencyMs: 10 })
    expect(fake.calls[0]?.args).toMatchObject({ p_ok: true, p_prompt_tokens: 5, p_completion_tokens: 7 })
  })

  it('no lanza si el rpc se rechaza y registra solo feature y nombre del error', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    const db = { rpc: async () => { throw new TypeError('red caída') } } as unknown as AiDb
    await expect(finishUsage(db, RESERVATION, { ok: false, usage: NO_USAGE, latencyMs: 1 })).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith('ai_finish threw', { feature: 'rewrite', error: 'TypeError' })
  })
})

describe('getUsageSummary y claimUsageAlert', () => {
  it('valida el resumen', async () => {
    expect(await getUsageSummary(fakeDb({ ai_usage_summary: () => ({ data: SUMMARY_FIXTURE, error: null }) }).db)).toEqual(SUMMARY_FIXTURE)
    await expect(getUsageSummary(fakeDb({ ai_usage_summary: () => ({ data: { used: 'x' }, error: null }) }).db)).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('regresa el correo solo la primera vez', async () => {
    expect(await claimUsageAlert(fakeDb({ ai_claim_usage_alert: () => ({ data: 'dueno@negocio.mx', error: null }) }).db, 80)).toBe('dueno@negocio.mx')
    expect(await claimUsageAlert(fakeDb({ ai_claim_usage_alert: () => ({ data: null, error: null }) }).db, 80)).toBeNull()
  })

  it('con error de la base regresa null', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    expect(await claimUsageAlert(fakeDb({ ai_claim_usage_alert: () => ({ data: null, error: { message: 'x' } }) }).db, 100)).toBeNull()
  })
})
