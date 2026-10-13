import { describe, expect, it } from 'vitest'
import { countLabel } from './count-label'

describe('countLabel', () => {
  it('usa singular solo para 1', () => {
    expect(countLabel(1, 'miembro', 'miembros')).toBe('1 miembro')
    expect(countLabel(0, 'miembro', 'miembros')).toBe('0 miembros')
    expect(countLabel(3, 'admin', 'admins')).toBe('3 admins')
  })
})
