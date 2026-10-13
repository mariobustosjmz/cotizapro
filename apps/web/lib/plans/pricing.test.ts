import { describe, expect, it } from 'vitest'
import { EXTRA_USER_MONTHLY_PRICE, PLANS, PLAN_ORDER, isPlanId } from './catalog'
import { extraUsersFor, formatMxn, monthlyCost, usersLabel } from './pricing'

describe('catálogo de planes', () => {
  it('ordena los planes de menor a mayor precio', () => {
    const prices = PLAN_ORDER.map((id) => PLANS[id].monthlyPrice)
    expect(prices).toEqual([0, 399, 999, 1590])
  })

  it('cobra 99 por usuario adicional', () => {
    expect(EXTRA_USER_MONTHLY_PRICE).toBe(99)
  })

  it('reconoce solo los identificadores de la base', () => {
    expect(isPlanId('pro')).toBe(true)
    expect(isPlanId('taller')).toBe(false)
  })
})

describe('monthlyCost', () => {
  it('no cobra extra mientras no se pasen los usuarios incluidos', () => {
    expect(monthlyCost('pro', 3)).toMatchObject({ extraUsers: 0, total: 999 })
  })

  it('suma 99 por cada usuario arriba del límite del plan', () => {
    expect(monthlyCost('pro', 6)).toMatchObject({ extraUsers: 3, extraUsersCost: 297, total: 1296 })
    expect(monthlyCost('enterprise', 40)).toMatchObject({ extraUsers: 30, total: 1590 + 30 * 99 })
  })

  it('Empresa cuesta menos que Taller desde 9 personas', () => {
    for (const users of [9, 10, 15, 40]) {
      expect(monthlyCost('enterprise', users).total).toBeLessThan(monthlyCost('pro', users).total)
    }
    expect(monthlyCost('pro', 8).total).toBeLessThan(monthlyCost('enterprise', 8).total)
  })

  it('Gratis y Solo son de una persona: el exceso se marca para cambiar de plan', () => {
    expect(monthlyCost('free', 3)).toMatchObject({ extraUsers: 0, total: 0, overLimit: 2 })
    expect(monthlyCost('starter', 2)).toMatchObject({ extraUsers: 0, total: 399, overLimit: 1 })
  })

  it('Taller incluye 3 usuarios y Empresa 10', () => {
    expect(PLANS.pro.includedUsers).toBe(3)
    expect(PLANS.enterprise.includedUsers).toBe(10)
    expect(monthlyCost('pro', 1).total).toBeGreaterThan(monthlyCost('starter', 1).total)
  })

  it('trata cuentas vacías o valores inválidos como cero usuarios', () => {
    expect(monthlyCost('starter', 0).total).toBe(399)
    expect(monthlyCost('starter', -4).activeUsers).toBe(0)
    expect(extraUsersFor('pro', 4.9)).toBe(1)
  })
})

describe('formato', () => {
  it('muestra pesos sin centavos', () => {
    expect(formatMxn(1999).replace(/\s/g, '')).toBe('$1,999')
  })

  it('describe usuarios incluidos y costo adicional', () => {
    expect(usersLabel('pro')).toContain('3 usuarios incluidos')
    expect(usersLabel('pro')).toContain('$99')
    expect(usersLabel('free')).toBe('1 usuario incluido')
  })
})
