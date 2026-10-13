import { describe, expect, it } from 'vitest'
import { isClientNotifiable, dueDateLimit } from './due-notifications'

describe('isClientNotifiable', () => {
  it('solo mantenimiento y renovación se avisan al cliente', () => {
    expect(isClientNotifiable('maintenance')).toBe(true)
    expect(isClientNotifiable('renewal')).toBe(true)
    expect(isClientNotifiable('follow_up')).toBe(false)
    expect(isClientNotifiable('custom')).toBe(false)
  })
})

describe('dueDateLimit', () => {
  it('regresa mañana en fecha local de Monterrey (YYYY-MM-DD)', () => {
    expect(dueDateLimit(new Date('2026-10-13T05:30:00Z'))).toBe('2026-10-13')
    expect(dueDateLimit(new Date('2026-10-13T18:00:00Z'))).toBe('2026-10-14')
  })
})
