import { describe, expect, it } from 'vitest'
import { PLANS, PLAN_ORDER } from './catalog'
import { FREE_MONTHLY_QUOTES, checkMonthlyQuotes, checkSeatLimit, monthStartIso, planLimits, planLimitsEnforced } from './limits'

describe('planLimits', () => {
  it('deriva usuarios incluidos y adicionales del catálogo', () => {
    for (const id of PLAN_ORDER) {
      expect(planLimits(id)).toMatchObject({ planId: id, includedUsers: PLANS[id].includedUsers, allowsExtraUsers: PLANS[id].allowsExtraUsers })
    }
  })

  it('coincide con org_plan_limits de la migración 042', () => {
    expect(PLAN_ORDER.map((id) => [planLimits(id).includedUsers, planLimits(id).allowsExtraUsers])).toEqual([
      [1, false], [1, false], [3, true], [10, true],
    ])
  })

  it('solo Gratis tiene tope de 5 cotizaciones al mes', () => {
    expect(FREE_MONTHLY_QUOTES).toBe(5)
    expect(planLimits('free').monthlyQuotes).toBe(5)
    expect((['starter', 'pro', 'enterprise'] as const).map((id) => planLimits(id).monthlyQuotes)).toEqual([null, null, null])
  })

  it('plantillas, analítica y recordatorios desde Solo; equipo, fotos y tablero desde Taller', () => {
    expect(planLimits('free').features).toEqual([])
    expect(planLimits('starter').features).toEqual(['templates', 'analytics', 'reminders'])
    expect(planLimits('pro').features).toEqual(expect.arrayContaining(['templates', 'team_roles', 'job_photos', 'kanban_board']))
    expect(planLimits('enterprise').features).toEqual(planLimits('pro').features)
  })
})

describe('planLimitsEnforced', () => {
  it('está apagado por omisión durante el piloto', () => {
    expect(planLimitsEnforced(undefined)).toBe(false)
    expect(planLimitsEnforced('false')).toBe(false)
    expect(planLimitsEnforced('1')).toBe(false)
    expect(planLimitsEnforced('true')).toBe(true)
  })
})

describe('checkSeatLimit', () => {
  it('Gratis y Solo no pueden sumar a nadie más', () => {
    expect(checkSeatLimit('free', 1, 0)).toMatchObject({ allowed: false, code: 'SEAT_LIMIT', upgradeTo: 'pro' })
    expect(checkSeatLimit('starter', 1, 0)).toMatchObject({ allowed: false, code: 'SEAT_LIMIT' })
  })

  it('cuenta las invitaciones pendientes como lugares ocupados', () => {
    expect(checkSeatLimit('starter', 0, 1).allowed).toBe(false)
    expect(checkSeatLimit('starter', 0, 0).allowed).toBe(true)
  })

  it('Taller y Empresa admiten usuarios adicionales con costo', () => {
    expect(checkSeatLimit('pro', 3, 2).allowed).toBe(true)
    expect(checkSeatLimit('enterprise', 40, 0).allowed).toBe(true)
  })

  it('el mensaje dice en qué plan está disponible', () => {
    const check = checkSeatLimit('free', 1, 0)
    expect(check.allowed ? '' : check.message).toContain('Disponible en Taller')
  })
})

describe('checkMonthlyQuotes', () => {
  it('permite la quinta y bloquea la sexta en Gratis', () => {
    expect(checkMonthlyQuotes('free', 4).allowed).toBe(true)
    const sixth = checkMonthlyQuotes('free', 5)
    expect(sixth).toMatchObject({ allowed: false, code: 'MONTHLY_QUOTES', upgradeTo: 'starter' })
    expect(sixth.allowed ? '' : sixth.message).toContain('Llegaste a 5 este mes')
  })

  it('los planes pagados no tienen tope', () => {
    expect(checkMonthlyQuotes('starter', 10_000).allowed).toBe(true)
  })
})

describe('monthStartIso', () => {
  it('usa el mes de Monterrey aunque en UTC ya sea el mes siguiente', () => {
    expect(monthStartIso(new Date('2026-11-01T03:00:00Z'))).toBe('2026-10-01T06:00:00.000Z')
  })

  it('regresa el primer día del mes a medianoche de Monterrey', () => {
    expect(monthStartIso(new Date('2026-10-13T18:00:00Z'))).toBe('2026-10-01T06:00:00.000Z')
  })

  it.each([
    ['2026-10-01T05:59:59Z', '2026-09-01T06:00:00.000Z'],
    ['2026-10-01T06:30:00Z', '2026-10-01T06:00:00.000Z'],
    ['2026-11-01T05:30:00Z', '2026-10-01T06:00:00.000Z'],
    ['2027-01-01T05:30:00Z', '2026-12-01T06:00:00.000Z'],
  ])('respeta el borde de mes en Monterrey (%s)', (now, expected) => {
    expect(monthStartIso(new Date(now))).toBe(expected)
  })
})
