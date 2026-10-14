import { describe, expect, it } from 'vitest'
import { clientActivityLines } from './activity'

const none = { viewed_at: null, accepted_at: null, rejected_at: null, rejection_reason: null, accepted_by_name: null }

describe('clientActivityLines', () => {
  it('sin actividad no hay leyendas', () => {
    expect(clientActivityLines(none)).toEqual([])
  })

  it('vista y aceptada con nombre', () => {
    const lines = clientActivityLines({ ...none, viewed_at: '2026-10-14T15:05:00Z', accepted_at: '2026-10-14T16:00:00Z', accepted_by_name: 'Laura Pérez' })
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^Vista por el cliente el 14 de octubre de 2026/)
    expect(lines[1]).toMatch(/^Aceptada desde la liga el 14 de octubre de 2026/)
    expect(lines[1]).toContain('por Laura Pérez')
  })

  it('rechazada con motivo', () => {
    const [line] = clientActivityLines({ ...none, rejected_at: '2026-10-15T18:00:00Z', rejection_reason: 'Muy caro' })
    expect(line).toMatch(/^Rechazada desde la liga el 15 de octubre de 2026/)
    expect(line).toContain('Motivo: Muy caro')
  })
})
