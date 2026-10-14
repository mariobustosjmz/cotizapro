import { describe, expect, it } from 'vitest'
import { updateOrganizationSchema } from './settings'

const base = { name: 'MEGAGLASS' }

describe('updateOrganizationSchema · anticipo', () => {
  it('acepta porcentaje, instrucciones y liga https', () => {
    const parsed = updateOrganizationSchema.parse({ ...base, deposit_percent: 30, deposit_instructions: '  CLABE 012  ', deposit_payment_url: 'https://mpago.la/2abc' })
    expect(parsed.deposit_percent).toBe(30)
    expect(parsed.deposit_instructions).toBe('CLABE 012')
  })

  it.each([150, -1, 33.5])('rechaza porcentaje %s', (deposit_percent) => {
    expect(updateOrganizationSchema.safeParse({ ...base, deposit_percent }).success).toBe(false)
  })

  it.each(['javascript:alert(1)', 'mpago.la/abc', `https://x.mx/${'a'.repeat(500)}`])('rechaza la liga %s', (deposit_payment_url) => {
    expect(updateOrganizationSchema.safeParse({ ...base, deposit_payment_url }).success).toBe(false)
  })

  it('rechaza una liga con esquema en mayúsculas con el mensaje en español', () => {
    const result = updateOrganizationSchema.safeParse({ ...base, deposit_payment_url: 'HTTPS://x.com' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('La liga de pago debe empezar con https://')
  })

  it.each([null, 'abc'])('rechaza porcentaje no numérico %s con mensaje en español', (deposit_percent) => {
    const result = updateOrganizationSchema.safeParse({ ...base, deposit_percent })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('El anticipo debe ser un número entero de 0 a 100')
  })

  it('rechaza instrucciones de más de 500 caracteres', () => {
    expect(updateOrganizationSchema.safeParse({ ...base, deposit_instructions: 'x'.repeat(501) }).success).toBe(false)
  })

  it('permite quitar instrucciones y liga con null', () => {
    expect(updateOrganizationSchema.safeParse({ ...base, deposit_instructions: null, deposit_payment_url: null }).success).toBe(true)
  })
})
