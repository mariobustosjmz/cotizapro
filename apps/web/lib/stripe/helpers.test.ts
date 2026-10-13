import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatPrice, getSubscriptionStatusLabel, planFromPriceIds } from './helpers'

const ENV_KEYS = ['STRIPE_STARTER_PRICE_ID', 'STRIPE_PRO_PRICE_ID', 'STRIPE_ENTERPRISE_PRICE_ID'] as const

describe('planFromPriceIds', () => {
  const saved: Record<string, string | undefined> = {}
  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k]
    process.env.STRIPE_STARTER_PRICE_ID = 'price_solo'
    process.env.STRIPE_PRO_PRICE_ID = 'price_taller'
    process.env.STRIPE_ENTERPRISE_PRICE_ID = 'price_empresa'
  })
  afterEach(() => {
    for (const k of ENV_KEYS) process.env[k] = saved[k]
  })

  it('reconoce el plan aunque la línea de usuarios adicionales venga primero', () => {
    expect(planFromPriceIds(['price_usuario_extra', 'price_taller'])).toBe('pro')
  })

  it('sin precio conocido regresa Gratis', () => {
    expect(planFromPriceIds(['price_otro', null])).toBe('free')
  })
})

describe('etiquetas', () => {
  it('traduce el estado de la suscripción', () => {
    expect(getSubscriptionStatusLabel('past_due')).toBe('Pago vencido')
  })

  it('formatea en pesos por omisión', () => {
    expect(formatPrice(999).replace(/\s/g, '')).toBe('$999')
  })
})
