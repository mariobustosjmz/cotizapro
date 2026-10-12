import { describe, expect, it } from 'vitest'
import { formatAmount } from './money'

describe('formatAmount', () => {
  it('siempre muestra dos decimales', () => {
    expect(formatAmount(1647.2)).toBe('1,647.20')
    expect(formatAmount(81084.62)).toBe('81,084.62')
    expect(formatAmount(0)).toBe('0.00')
  })

  it('redondea a centavos', () => {
    expect(formatAmount(6078.307)).toBe('6,078.31')
  })

  it('acepta los numéricos que Supabase devuelve como texto', () => {
    expect(formatAmount('12550.27')).toBe('12,550.27')
    expect(formatAmount('1900')).toBe('1,900.00')
  })

  it('trata valores vacíos o inválidos como cero', () => {
    expect(formatAmount(null)).toBe('0.00')
    expect(formatAmount('abc')).toBe('0.00')
  })
})
