import { describe, expect, it } from 'vitest'
import { parseWallClock } from './wall-clock'

describe('parseWallClock', () => {
  it('conserva la hora capturada aunque Postgres la devuelva con +00:00', () => {
    const d = parseWallClock('2026-10-13T16:00:00+00:00')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 9, 13, 16, 0])
  })

  it('acepta el formato sin zona que envía el formulario', () => {
    const d = parseWallClock('2026-10-16T09:30:00')
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([16, 9, 30])
  })

  it('acepta el separador de espacio y la "Z" de UTC', () => {
    expect(parseWallClock('2026-10-17 10:00:00+00').getHours()).toBe(10)
    expect(parseWallClock('2026-10-17T23:45:00Z').getHours()).toBe(23)
  })

  it('no cambia de día cerca de la medianoche', () => {
    const d = parseWallClock('2026-10-12T00:15:00+00:00')
    expect([d.getDate(), d.getHours()]).toEqual([12, 0])
  })
})
