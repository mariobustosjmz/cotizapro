import { describe, expect, it } from 'vitest'
import { mergeBellItems } from './merge-bell-items'
import type { BellItem } from './types'

const item = (id: string, date: string, over: Partial<BellItem> = {}): BellItem => ({
  id, type: 'reminder', kind: 'reminder', title: id, subtitle: '', date, priority: 'normal', read: false, href: '#', ...over,
})

describe('mergeBellItems', () => {
  it('conserva la respuesta sin leer aunque haya 20 elementos más recientes', () => {
    const reminders = Array.from({ length: 20 }, (_, i) => item(`r${i}`, `2026-10-${String(10 + (i % 10)).padStart(2, '0')}T00:00:00Z`))
    const response = item('resp', '2026-09-01T00:00:00Z', { type: 'send', kind: 'client_response' })
    const merged = mergeBellItems([response], reminders, 15)
    expect(merged.map((i) => i.id)).toContain('resp')
    expect(merged).toHaveLength(15)
  })

  it('no duplica una respuesta presente en ambos grupos', () => {
    const response = item('resp', '2026-10-01T00:00:00Z', { kind: 'client_response' })
    const merged = mergeBellItems([response], [response, item('a', '2026-10-02T00:00:00Z')], 15)
    expect(merged.filter((i) => i.id === 'resp')).toHaveLength(1)
  })

  it('ordena el resto por fecha descendente', () => {
    const merged = mergeBellItems([], [item('old', '2026-10-01T00:00:00Z'), item('new', '2026-10-05T00:00:00Z')], 15)
    expect(merged.map((i) => i.id)).toEqual(['new', 'old'])
  })

  it('no recorta las respuestas sin leer por encima del límite', () => {
    const unread = Array.from({ length: 3 }, (_, i) => item(`u${i}`, `2026-10-0${i + 1}T00:00:00Z`))
    expect(mergeBellItems(unread, [item('x', '2026-10-09T00:00:00Z')], 2)).toHaveLength(3)
  })
})
