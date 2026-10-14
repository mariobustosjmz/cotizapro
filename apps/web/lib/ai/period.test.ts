import { describe, expect, it } from 'vitest'
import { aiPeriod, formatResetDate } from './period'

describe('aiPeriod', () => {
  it('a las 23:30 del 31 de octubre en Monterrey sigue siendo octubre', () => {
    expect(aiPeriod(new Date('2026-11-01T05:30:00Z'))).toEqual({ start: '2026-10-01', resetsOn: '2026-11-01' })
  })

  it('a las 00:00 del 1 de noviembre en Monterrey empieza noviembre', () => {
    expect(aiPeriod(new Date('2026-11-01T06:00:00Z'))).toEqual({ start: '2026-11-01', resetsOn: '2026-12-01' })
  })

  it('diciembre se reinicia el 1 de enero del año siguiente', () => {
    expect(aiPeriod(new Date('2026-12-15T12:00:00Z'))).toEqual({ start: '2026-12-01', resetsOn: '2027-01-01' })
  })
})

describe('formatResetDate', () => {
  it('escribe el día y el mes en español', () => {
    expect(formatResetDate('2026-11-01')).toBe('1 de noviembre')
    expect(formatResetDate('2027-01-01')).toBe('1 de enero')
  })
})
