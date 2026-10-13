import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildCheckoutItems } from './checkout-items'

const KEYS = ['STRIPE_PRO_PRICE_ID', 'STRIPE_EXTRA_USER_PRICE_ID'] as const

describe('buildCheckoutItems', () => {
  const saved: Record<string, string | undefined> = {}
  beforeEach(() => {
    for (const k of KEYS) saved[k] = process.env[k]
    process.env.STRIPE_PRO_PRICE_ID = 'price_taller'
    process.env.STRIPE_EXTRA_USER_PRICE_ID = 'price_extra'
  })
  afterEach(() => {
    for (const k of KEYS) process.env[k] = saved[k]
  })

  it('dentro del límite cobra solo el plan', () => {
    expect(buildCheckoutItems('pro', 3)).toEqual({ ok: true, items: [{ price: 'price_taller', quantity: 1 }] })
  })

  it('arriba del límite agrega usuarios adicionales por cantidad', () => {
    expect(buildCheckoutItems('pro', 5)).toEqual({
      ok: true,
      items: [{ price: 'price_taller', quantity: 1 }, { price: 'price_extra', quantity: 2 }],
    })
  })

  it('rechaza el plan Gratis', () => {
    expect(buildCheckoutItems('free', 1).ok).toBe(false)
  })

  it('no cobra a medias si falta el precio de usuario adicional', () => {
    delete process.env.STRIPE_EXTRA_USER_PRICE_ID
    expect(buildCheckoutItems('pro', 9).ok).toBe(false)
  })

  it('sin precio del plan configurado avisa que el cobro no está disponible', () => {
    delete process.env.STRIPE_PRO_PRICE_ID
    expect(buildCheckoutItems('pro', 1)).toEqual({ ok: false, error: 'El cobro en línea aún no está disponible' })
  })
})
