import { describe, expect, it } from 'vitest'
import { parseDepositOverride } from './override'

describe('parseDepositOverride', () => {
  it('vacío significa usar el porcentaje de la empresa', () => {
    expect(parseDepositOverride('  ')).toEqual({ ok: true, value: null })
  })

  it.each([['0', 0], ['30', 30], ['100', 100]] as const)('acepta %s', (raw, value) => {
    expect(parseDepositOverride(raw)).toEqual({ ok: true, value })
  })

  it.each(['101', '33.5', '-1', 'abc'])('rechaza %s', (raw) => {
    expect(parseDepositOverride(raw)).toEqual({ ok: false, error: 'Usa un número entero de 0 a 100' })
  })
})
