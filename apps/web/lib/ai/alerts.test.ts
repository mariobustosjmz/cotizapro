import { afterEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/logger'
import { crossedThreshold, notifyUsageThreshold, usageAlertEmail, type SendEmail } from './alerts'
import { fakeDb } from './testing/fake-db'
import type { AiDb } from './usage'
import { SUMMARY_FIXTURE } from './testing/fixtures'

describe('avisos de uso de IA', () => {
  afterEach(() => vi.restoreAllMocks())

  it('detecta el umbral alcanzado', () => {
    expect(crossedThreshold(79)).toBeNull()
    expect(crossedThreshold(80)).toBe(80)
    expect(crossedThreshold(100)).toBe(100)
  })

  it('arma un correo en español sin contenido de clientes', () => {
    const email = usageAlertEmail(80, { ...SUMMARY_FIXTURE, used: 320, percent: 80 }, 'https://app.cotizapro.mx')
    expect(email.subject).toBe('Usaste el 80 % de tus créditos de IA')
    expect(email.text).toContain('320 de 400 créditos de IA')
    expect(email.text).toContain('1 de noviembre')
    expect(email.html).toContain('https://app.cotizapro.mx/dashboard/billing#ia')
  })

  it('manda un solo correo por umbral', async () => {
    const send = vi.fn<SendEmail>(async () => ({ success: true }))
    let claimed = false
    const fake = fakeDb({
      ai_claim_usage_alert: () => {
        const data = claimed ? null : 'dueno@negocio.mx'
        claimed = true
        return { data, error: null }
      },
    })
    const summary = { ...SUMMARY_FIXTURE, percent: 100, remaining: 0 }
    await notifyUsageThreshold(fake.db, summary, send, 'https://app.cotizapro.mx')
    await notifyUsageThreshold(fake.db, summary, send, 'https://app.cotizapro.mx')
    expect(fake.calls[0]?.args).toEqual({ p_threshold: 100 })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'dueno@negocio.mx', subject: 'Se acabaron tus créditos de IA de este mes' }))
  })

  it('un envío rechazado o fallido no propaga y registra solo el umbral', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    const fake = fakeDb({ ai_claim_usage_alert: () => ({ data: 'dueno@negocio.mx', error: null }) })
    const summary = { ...SUMMARY_FIXTURE, percent: 80 }
    await expect(notifyUsageThreshold(fake.db, summary, async () => { throw new Error('smtp dueno@negocio.mx') }, 'https://a.mx')).resolves.toBeUndefined()
    await expect(notifyUsageThreshold(fake.db, summary, async () => ({ success: false, error: 'dueno@negocio.mx' }), 'https://a.mx')).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(2)
    for (const call of warn.mock.calls) expect(call[1]).toEqual({ threshold: 80 })
  })

  it('si el reclamo falla o se rechaza no envía ni propaga', async () => {
    vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
    const send = vi.fn<SendEmail>(async () => ({ success: true }))
    const summary = { ...SUMMARY_FIXTURE, percent: 90 }
    const failing = fakeDb({ ai_claim_usage_alert: () => ({ data: null, error: { message: 'x' } }) })
    await notifyUsageThreshold(failing.db, summary, send, 'https://a.mx')
    const rejecting = { rpc: async () => { throw new Error('red') } } as unknown as AiDb
    await expect(notifyUsageThreshold(rejecting, summary, send, 'https://a.mx')).resolves.toBeUndefined()
    expect(send).not.toHaveBeenCalled()
  })

  it('escapa los valores interpolados en el HTML', () => {
    const email = usageAlertEmail(80, SUMMARY_FIXTURE, 'https://a.mx/?x="><script>&y=\'')
    expect(email.html).not.toContain('<script>')
    expect(email.html).toContain('&lt;script&gt;&amp;y=&#39;')
    expect(email.html).toMatch(/href="[^"]*#ia"/)
  })

  it('no consulta la base por debajo del 80 %', async () => {
    const fake = fakeDb({})
    await notifyUsageThreshold(fake.db, SUMMARY_FIXTURE, vi.fn(), 'https://app.cotizapro.mx')
    expect(fake.calls).toHaveLength(0)
  })
})
