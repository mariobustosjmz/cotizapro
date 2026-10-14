import { describe, expect, it } from 'vitest'
import { billingState } from './expiry'
import { adminExpiryLabel, expiryBanner, planStatusLine } from './expiry-copy'
import type { PlanId } from '@/lib/plans/types'

const now = new Date('2026-10-13T15:00:00.000Z')
const stateOf = (planId: PlanId, end: string | null) => billingState({ planId, currentPeriodEnd: end }, now)

describe('expiryBanner', () => {
  it('avisa en amarillo con los días que faltan', () => {
    expect(expiryBanner(stateOf('pro', '2026-10-16T14:00:00Z'))).toEqual({
      tone: 'warning',
      message: 'Tu plan Taller vence en 3 días. Al vencer, la cuenta queda en solo lectura hasta renovar.',
      ctaLabel: 'Renovar',
      ctaHref: '/dashboard/billing',
    })
  })

  it('usa singular con 1 día', () => {
    expect(expiryBanner(stateOf('starter', '2026-10-14T10:00:00Z'))?.message).toContain('vence en 1 día.')
  })

  it('en rojo y con la fecha cuando ya venció', () => {
    const banner = expiryBanner(stateOf('pro', '2026-10-12T18:00:00Z'))
    expect(banner?.tone).toBe('danger')
    expect(banner?.message).toContain('venció el 12 de octubre de 2026')
    expect(banner?.message).toContain('no crear, editar ni enviar')
  })

  it('no muestra nada si falta más de una semana, en Gratis ni sin vencimiento', () => {
    expect(expiryBanner(stateOf('pro', '2026-11-13T15:00:00Z'))).toBeNull()
    expect(expiryBanner(stateOf('free', null))).toBeNull()
    expect(expiryBanner(stateOf('pro', null))).toBeNull()
  })
})

describe('planStatusLine', () => {
  it('muestra el plan y la fecha de vencimiento', () => {
    expect(planStatusLine(stateOf('pro', '2026-11-13T15:00:00Z'))).toBe('Plan Taller · vence el 13 de noviembre de 2026')
  })

  it('describe Gratis, sin vencimiento y vencido', () => {
    expect(planStatusLine(stateOf('free', null))).toBe('Plan Gratis · sin vencimiento')
    expect(planStatusLine(stateOf('enterprise', null))).toBe('Plan Empresa · sin fecha de vencimiento')
    expect(planStatusLine(stateOf('pro', '2026-10-12T18:00:00Z'))).toBe('Plan Taller · venció el 12 de octubre de 2026 · solo lectura')
  })
})

describe('adminExpiryLabel', () => {
  it('resume el vencimiento para la tabla de /admin', () => {
    expect(adminExpiryLabel(stateOf('pro', '2026-11-13T15:00:00Z'))).toBe('Vence en 31 días')
    expect(adminExpiryLabel(stateOf('pro', '2026-10-12T18:00:00Z'))).toBe('Vencido')
    expect(adminExpiryLabel(stateOf('free', null))).toBe('Gratis · no vence')
    expect(adminExpiryLabel(stateOf('pro', null))).toBe('Sin vencimiento')
  })
})

describe('expiryBanner con suscripción de Mercado Pago', () => {
  it('por vencer: avisa que el cobro es automático y no pide renovar', () => {
    const banner = expiryBanner(stateOf('pro', '2026-10-16T14:00:00Z'), { autoRenews: true })
    expect(banner?.tone).toBe('warning')
    expect(banner?.message).toContain('el cobro es automático')
    expect(banner?.ctaLabel).toBe('Ver Facturación')
  })

  it('vencida: sigue en rojo y explica que se activa al confirmar el cargo', () => {
    const banner = expiryBanner(stateOf('pro', '2026-10-12T14:00:00Z'), { autoRenews: true })
    expect(banner?.tone).toBe('danger')
    expect(banner?.message).toContain('en cuanto confirmemos el cargo de Mercado Pago')
  })
})
