import { describe, expect, it } from 'vitest'
import { activationAmount } from './activation'

describe('activationAmount', () => {
  it('multiplica el costo mensual con usuarios adicionales por los meses', () => {
    expect(activationAmount('pro', 6, 2)).toBe((999 + 3 * 99) * 2)
    expect(activationAmount('enterprise', 10, 1)).toBe(1590)
    expect(activationAmount('starter', 1, 3)).toBe(1197)
  })

  it('Gratis siempre es 0', () => {
    expect(activationAmount('free', 1, 12)).toBe(0)
  })

  it('no acepta meses fraccionarios ni negativos', () => {
    expect(activationAmount('pro', 1, 1.9)).toBe(999)
    expect(activationAmount('pro', 1, -2)).toBe(0)
  })
})
