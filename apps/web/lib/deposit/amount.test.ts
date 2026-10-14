import { describe, expect, it } from 'vitest'
import { DEFAULT_DEPOSIT_PERCENT, depositAmount } from './amount'

describe('depositAmount', () => {
  it('usa 50 % por omisión', () => {
    expect(DEFAULT_DEPOSIT_PERCENT).toBe(50)
  })

  it.each([
    [12238.48, 50, 6119.24],
    [999.99, 33, 330],
    [100.01, 50, 50.01],
    ['1740.00', 50, 870],
    [1000, 100, 1000],
    [1500, 0, 0],
    [Number.NaN, 50, 0],
    [-200, 50, 0],
  ] as const)('total %s al %s %% → %s', (total, percent, expected) => {
    expect(depositAmount(total, percent)).toBe(expected)
  })

  it('no pasa del 100 %', () => {
    expect(depositAmount(500, 150)).toBe(500)
  })
})
