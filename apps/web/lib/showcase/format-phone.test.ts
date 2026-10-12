import { describe, expect, it } from 'vitest'
import { formatMxPhone } from './format-phone'

describe('formatMxPhone', () => {
  it('formats numbers with country code', () => expect(formatMxPhone('528112345678')).toBe('+52 81 1234 5678'))
  it('formats 10-digit local numbers', () => expect(formatMxPhone('8112345678')).toBe('81 1234 5678'))
  it('leaves other lengths untouched', () => expect(formatMxPhone('1234567')).toBe('1234567'))
})
