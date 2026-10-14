import { describe, expect, it } from 'vitest'
import { billingState } from './expiry'
import {
  checkoutOptionFor,
  checkoutOptionsFor,
  hasMercadoPagoLinks,
  mercadoPagoLink,
  plansIntro,
  type CheckoutContext,
} from './checkout-option'

const now = new Date('2026-10-13T15:00:00Z')
const env = {
  MP_LINK_STARTER: 'https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=solo',
  MP_LINK_PRO: 'https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=taller',
  MP_LINK_ENTERPRISE: ' https://mpago.la/empresa ',
  SUPPORT_WHATSAPP_PHONE: '8112345678',
}
const base: CheckoutContext = {
  currentPlan: 'free',
  state: billingState({ planId: 'free', currentPeriodEnd: null }, now),
  activeUsers: 1,
  stripeEnabled: false,
  businessName: 'Plomería Don Beto',
  env,
}

describe('mercadoPagoLink', () => {
  it('lee la liga de cada plan y recorta espacios', () => {
    expect(mercadoPagoLink('starter', env)).toBe(env.MP_LINK_STARTER)
    expect(mercadoPagoLink('enterprise', env)).toBe('https://mpago.la/empresa')
  })

  it('ignora valores que no son ligas https', () => {
    expect(mercadoPagoLink('pro', { MP_LINK_PRO: 'http://mpago.la/x' })).toBeNull()
    expect(mercadoPagoLink('pro', { MP_LINK_PRO: 'javascript:alert(1)' })).toBeNull()
    expect(mercadoPagoLink('pro', { MP_LINK_PRO: 'no es liga' })).toBeNull()
  })

  it('Gratis no tiene liga', () => {
    expect(mercadoPagoLink('free', env)).toBeNull()
  })
})

describe('checkoutOptionFor', () => {
  it('sin variables, los planes pagados quedan en Próximamente', () => {
    expect(checkoutOptionFor('pro', { ...base, env: {} })).toEqual({ kind: 'unavailable' })
  })

  it('si Stripe está configurado y no hay liga, conserva el flujo de Stripe', () => {
    expect(checkoutOptionFor('pro', { ...base, env: {}, stripeEnabled: true })).toEqual({ kind: 'stripe' })
  })

  it('muestra la liga de Mercado Pago del plan', () => {
    expect(checkoutOptionFor('starter', base)).toEqual({ kind: 'mercadopago', url: env.MP_LINK_STARTER, renewing: false })
  })

  it('con más usuarios que los incluidos manda a WhatsApp con el total exacto', () => {
    const option = checkoutOptionFor('pro', { ...base, activeUsers: 5 })
    expect(option).toMatchObject({ kind: 'whatsapp', total: 999 + 2 * 99 })
    if (option.kind !== 'whatsapp') throw new Error('se esperaba WhatsApp')
    expect(option.url).toContain('https://wa.me/528112345678')
    expect(decodeURIComponent(option.url ?? '')).toContain('1,197')
    expect(decodeURIComponent(option.url ?? '')).toContain('Plomería Don Beto')
  })

  it('sin teléfono de soporte no hay botón, pero sí el total', () => {
    expect(checkoutOptionFor('pro', { ...base, activeUsers: 5, env: { ...env, SUPPORT_WHATSAPP_PHONE: undefined } }))
      .toEqual({ kind: 'whatsapp', total: 1197, url: null })
  })

  it('Solo no alcanza para un equipo de 2', () => {
    expect(checkoutOptionFor('starter', { ...base, activeUsers: 2 })).toEqual({ kind: 'too_small' })
  })

  it('el plan actual vigente no se vuelve a contratar', () => {
    const ctx: CheckoutContext = { ...base, currentPlan: 'pro', state: billingState({ planId: 'pro', currentPeriodEnd: '2026-12-01T00:00:00Z' }, now) }
    expect(checkoutOptionFor('pro', ctx)).toEqual({ kind: 'current' })
  })

  it('el plan actual vencido o por vencer ofrece renovar con la misma liga', () => {
    const ctx: CheckoutContext = { ...base, currentPlan: 'pro', state: billingState({ planId: 'pro', currentPeriodEnd: '2026-10-12T00:00:00Z' }, now) }
    expect(checkoutOptionFor('pro', ctx)).toEqual({ kind: 'mercadopago', url: env.MP_LINK_PRO, renewing: true })
  })

  it('sin liga ni Stripe, quien debe renovar recibe soporte por WhatsApp con el monto', () => {
    const ctx: CheckoutContext = {
      ...base,
      currentPlan: 'pro',
      env: { SUPPORT_WHATSAPP_PHONE: '8112345678' },
      state: billingState({ planId: 'pro', currentPeriodEnd: '2026-10-12T00:00:00Z' }, now),
    }
    const option = checkoutOptionFor('pro', ctx)
    expect(option.kind).toBe('whatsapp')
    if (option.kind !== 'whatsapp') return
    expect(option.url).toContain('wa.me/528112345678')
    expect(checkoutOptionFor('starter', ctx)).toEqual({ kind: 'unavailable' })
  })

  it('sin teléfono de soporte la renovación queda en WhatsApp sin liga', () => {
    const ctx: CheckoutContext = {
      ...base,
      currentPlan: 'pro',
      env: {},
      state: billingState({ planId: 'pro', currentPeriodEnd: '2026-10-12T00:00:00Z' }, now),
    }
    expect(checkoutOptionFor('pro', ctx)).toEqual({ kind: 'whatsapp', url: null, total: expect.any(Number) })
  })

  it('con liga de Mercado Pago gana sobre Stripe', () => {
    expect(checkoutOptionFor('starter', { ...base, stripeEnabled: true })).toEqual({ kind: 'mercadopago', url: env.MP_LINK_STARTER, renewing: false })
  })

  it('sin nombre de negocio el mensaje dice "mi negocio"', () => {
    const option = checkoutOptionFor('pro', { ...base, businessName: '  ', activeUsers: 4 })
    if (option.kind !== 'whatsapp' || !option.url) throw new Error('se esperaba WhatsApp con liga')
    expect(decodeURIComponent(option.url)).toContain('para mi negocio con 4 usuarios')
  })

  it('Gratis es "Incluido" salvo que sea el plan actual', () => {
    expect(checkoutOptionFor('free', base)).toEqual({ kind: 'current' })
    expect(checkoutOptionFor('free', { ...base, currentPlan: 'pro' })).toEqual({ kind: 'included' })
  })

  it('arma las cuatro tarjetas', () => {
    expect(Object.keys(checkoutOptionsFor(base))).toEqual(['free', 'starter', 'pro', 'enterprise'])
  })
})

describe('hasMercadoPagoLinks y plansIntro', () => {
  it('detecta si hay al menos una liga válida', () => {
    expect(hasMercadoPagoLinks(env)).toBe(true)
    expect(hasMercadoPagoLinks({ MP_LINK_PRO: 'http://inseguro' })).toBe(false)
  })

  it('explica cómo se contrata', () => {
    expect(plansIntro(true, checkoutOptionsFor(base))).toContain('Mercado Pago')
    expect(plansIntro(false, checkoutOptionsFor({ ...base, env: {} }))).toContain('próximamente')
  })
})
