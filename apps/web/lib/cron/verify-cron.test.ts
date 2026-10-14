import { describe, expect, it } from 'vitest'
import { verifyCronAuthorization } from './verify-cron'

const secret = 'x'.repeat(40)

describe('verifyCronAuthorization', () => {
  it('acepta el Bearer exacto', () => {
    expect(verifyCronAuthorization(`Bearer ${secret}`, secret)).toEqual({ ok: true, secret })
  })

  it('rechaza encabezado ausente o distinto', () => {
    expect(verifyCronAuthorization(null, secret)).toEqual({ ok: false, status: 401, reason: 'missing' })
    expect(verifyCronAuthorization(`Bearer ${'y'.repeat(40)}`, secret)).toEqual({ ok: false, status: 401, reason: 'invalid' })
    expect(verifyCronAuthorization('Bearer corto', secret)).toEqual({ ok: false, status: 401, reason: 'invalid' })
  })

  it('falla cerrado si CRON_SECRET no está configurado o es corto', () => {
    expect(verifyCronAuthorization(`Bearer ${secret}`, undefined)).toEqual({ ok: false, status: 500, reason: 'not_configured' })
    expect(verifyCronAuthorization('Bearer corto', 'corto')).toEqual({ ok: false, status: 500, reason: 'not_configured' })
  })
})
