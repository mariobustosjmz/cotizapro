import { describe, expect, it } from 'vitest'
import { billingState, daysUntilExpiry, formatExpiryDate, noticeKindFor, snapshotFromRow } from './expiry'

const now = new Date('2026-10-13T15:00:00.000Z')
const DAY = 86_400_000
const inDays = (days: number, extraMs = 0): string => new Date(now.getTime() + days * DAY + extraMs).toISOString()

describe('snapshotFromRow', () => {
  it('trata planes desconocidos o filas vacías como Gratis', () => {
    expect(snapshotFromRow(null)).toEqual({ planId: 'free', currentPeriodEnd: null })
    expect(snapshotFromRow({ plan: 'gold', current_period_end: null }).planId).toBe('free')
  })

  it('conserva plan y fin de periodo', () => {
    expect(snapshotFromRow({ plan: 'pro', current_period_end: '2026-11-13T15:00:00+00:00' }))
      .toEqual({ planId: 'pro', currentPeriodEnd: '2026-11-13T15:00:00+00:00' })
  })
})

describe('daysUntilExpiry', () => {
  it('redondea hacia arriba', () => {
    expect(daysUntilExpiry(inDays(0, 3_600_000), now)).toBe(1)
    expect(daysUntilExpiry(inDays(3, -3_600_000), now)).toBe(3)
  })

  it('regresa null con fechas inválidas', () => {
    expect(daysUntilExpiry('no-es-fecha', now)).toBeNull()
  })
})

describe('billingState', () => {
  it('Gratis nunca vence, aunque tenga una fecha vieja', () => {
    expect(billingState({ planId: 'free', currentPeriodEnd: inDays(-30) }, now)).toEqual({ kind: 'free' })
  })

  it('un plan pagado sin periodo (demo o presentación) no vence', () => {
    expect(billingState({ planId: 'pro', currentPeriodEnd: null }, now)).toEqual({ kind: 'open_ended', planId: 'pro' })
    expect(billingState({ planId: 'pro', currentPeriodEnd: 'basura' }, now).kind).toBe('open_ended')
  })

  it('vigente con más de 7 días', () => {
    expect(billingState({ planId: 'pro', currentPeriodEnd: inDays(10) }, now)).toMatchObject({ kind: 'active', daysLeft: 10 })
    expect(billingState({ planId: 'pro', currentPeriodEnd: inDays(7, 1) }, now)).toMatchObject({ kind: 'active', daysLeft: 8 })
  })

  it('por vencer desde 7 días antes', () => {
    expect(billingState({ planId: 'pro', currentPeriodEnd: inDays(7) }, now)).toMatchObject({ kind: 'expiring', daysLeft: 7 })
    expect(billingState({ planId: 'starter', currentPeriodEnd: inDays(3, -3_600_000) }, now)).toMatchObject({ kind: 'expiring', daysLeft: 3 })
  })

  it('vencido desde el instante exacto del fin', () => {
    expect(billingState({ planId: 'pro', currentPeriodEnd: now.toISOString() }, now).kind).toBe('expired')
    expect(billingState({ planId: 'enterprise', currentPeriodEnd: inDays(-1) }, now).kind).toBe('expired')
  })
})

describe('noticeKindFor', () => {
  it.each([
    [10, null], [8, null], [7, 'd7'], [4, 'd7'], [3, 'd3'], [2, 'd3'], [1, 'd1'], [0, 'd0'], [-2, 'd0'],
  ] as const)('%i días → %s', (days, kind) => {
    expect(noticeKindFor(days)).toBe(kind)
  })
})

describe('formatExpiryDate', () => {
  it('usa la fecha de Monterrey', () => {
    expect(formatExpiryDate('2026-11-13T05:59:00Z')).toBe('12 de noviembre de 2026')
    expect(formatExpiryDate('2026-11-13T06:00:00Z')).toBe('13 de noviembre de 2026')
  })
})

describe('formatExpiryDate con fecha inválida', () => {
  it('no muestra Invalid Date', () => {
    expect(formatExpiryDate('no-es-fecha')).toBe('fecha no disponible')
  })
})
