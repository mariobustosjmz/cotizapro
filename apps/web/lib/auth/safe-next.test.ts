import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safe-next'

describe('safeNextPath', () => {
  it('acepta rutas internas', () => {
    expect(safeNextPath('/invite/abc')).toBe('/invite/abc')
    expect(safeNextPath('/dashboard/quotes?view=kanban')).toBe('/dashboard/quotes?view=kanban')
  })

  it('rechaza redirecciones a otros sitios', () => {
    expect(safeNextPath('https://evil.com')).toBeNull()
    expect(safeNextPath('//evil.com')).toBeNull()
    expect(safeNextPath('/\\evil.com')).toBeNull()
    expect(safeNextPath('javascript:alert(1)')).toBeNull()
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath('/' + 'a'.repeat(600))).toBeNull()
  })
})
