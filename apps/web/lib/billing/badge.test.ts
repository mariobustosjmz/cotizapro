import { describe, expect, it } from 'vitest'
import { billingBadge } from './badge'
import { billingState } from './expiry'

const now = new Date('2026-10-13T15:00:00Z')

describe('billingBadge', () => {
  it('Gratis no muestra periodo de prueba', () => {
    expect(billingBadge(billingState({ planId: 'free', currentPeriodEnd: null }, now), 'trialing')).toEqual({ label: 'Gratis', tone: 'neutral' })
  })

  it('vencido en rojo y por vencer en azul', () => {
    expect(billingBadge(billingState({ planId: 'pro', currentPeriodEnd: '2026-10-12T00:00:00Z' }, now), 'active')).toEqual({ label: 'Vencido', tone: 'danger' })
    expect(billingBadge(billingState({ planId: 'pro', currentPeriodEnd: '2026-10-15T00:00:00Z' }, now), 'active')).toEqual({ label: 'Por vencer', tone: 'info' })
  })

  it('vigente usa la etiqueta del estado de la suscripción', () => {
    expect(billingBadge(billingState({ planId: 'pro', currentPeriodEnd: '2026-12-01T00:00:00Z' }, now), 'active')).toEqual({ label: 'Activa', tone: 'success' })
    expect(billingBadge(billingState({ planId: 'pro', currentPeriodEnd: null }, now), 'trialing')).toEqual({ label: 'Periodo de prueba', tone: 'info' })
  })
})
