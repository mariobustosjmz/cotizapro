import { describe, expect, it, vi } from 'vitest'

const loggerError = vi.hoisted(() => vi.fn())
vi.mock('@/lib/logger', () => ({ logger: { error: loggerError } }))

import { getReviewsForReply, toReviewForReply } from './review-replies'

const row = {
  id: '00000000-0000-0000-00c0-000000000501',
  rating: 5,
  comment: 'Muy buen trabajo',
  owner_reply: null,
  is_visible: true,
  submitted_at: '2026-10-05T18:00:00Z',
  clients: { name: 'Laura Treviño' },
}

describe('toReviewForReply', () => {
  it('convierte la fila con el nombre del cliente', () => {
    expect(toReviewForReply(row)).toEqual({
      id: row.id,
      rating: 5,
      comment: 'Muy buen trabajo',
      ownerReply: null,
      isVisible: true,
      submittedAt: '2026-10-05T18:00:00Z',
      clientName: 'Laura Treviño',
    })
  })

  it('acepta el cliente como arreglo o nulo', () => {
    expect(toReviewForReply({ ...row, clients: [{ name: 'Beto' }] })?.clientName).toBe('Beto')
    expect(toReviewForReply({ ...row, clients: null })?.clientName).toBeNull()
  })

  it('descarta filas sin enviar o mal formadas', () => {
    expect(toReviewForReply({ ...row, submitted_at: null })).toBeNull()
    expect(toReviewForReply({ id: 'x' })).toBeNull()
  })

  it('no expone correo ni teléfono aunque vengan en la fila', () => {
    const result = toReviewForReply({ ...row, clients: { name: 'Laura', email: 'l@x.mx', phone: '8112345678' } })
    expect(JSON.stringify(result)).not.toMatch(/l@x\.mx|8112345678/)
  })
})

function fakeDb(data: unknown[] | null, error: { code: string; message: string } | null = null) {
  const calls: Array<[string, ...unknown[]]> = []
  const chain: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'not', 'order', 'limit']) {
    chain[name] = vi.fn((...args: unknown[]) => {
      calls.push([name, ...args])
      return name === 'limit' ? Promise.resolve({ data, error }) : chain
    })
  }
  const from = vi.fn((table: string) => (calls.push(['from', table]), chain))
  return { db: { from } as never, calls }
}

describe('getReviewsForReply', () => {
  it('consulta una sola vez, por empresa, con columnas explícitas, límite 20 y más recientes primero', async () => {
    const { db, calls } = fakeDb([row])
    const result = await getReviewsForReply(db, 'org-1')
    expect(result).toEqual({ reviews: [expect.objectContaining({ id: row.id })], failed: false })
    expect(calls.filter(([n]) => n === 'from')).toEqual([['from', 'reviews']])
    expect(calls).toContainEqual(['eq', 'organization_id', 'org-1'])
    expect(calls).toContainEqual(['order', 'submitted_at', { ascending: false }])
    expect(calls).toContainEqual(['limit', 20])
    const select = calls.find(([n]) => n === 'select')?.[1] as string
    expect(select).toContain('clients(name)')
    expect(select).not.toContain('*')
    expect(select).not.toMatch(/email|phone|token/)
  })

  it('omite filas mal formadas', async () => {
    const { db } = fakeDb([row, { id: 'x' }])
    expect((await getReviewsForReply(db, 'org-1')).reviews).toHaveLength(1)
  })

  it('marca failed (distinto de vacío) y registra solo org y código si la consulta falla', async () => {
    const { db } = fakeDb(null, { code: '42501', message: 'secreto interno' })
    expect(await getReviewsForReply(db, 'org-1')).toEqual({ reviews: [], failed: true })
    expect(loggerError).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(loggerError.mock.calls[0])).not.toContain('secreto')
    expect(JSON.stringify(loggerError.mock.calls[0])).toContain('42501')
  })

  it('sin reseñas no es una falla', async () => {
    const { db } = fakeDb([])
    expect(await getReviewsForReply(db, 'org-1')).toEqual({ reviews: [], failed: false })
  })

  it('trae is_visible en la consulta y lo expone', async () => {
    const { db, calls } = fakeDb([{ ...row, is_visible: false }])
    const result = await getReviewsForReply(db, 'org-1')
    expect(calls.find(([n]) => n === 'select')?.[1]).toContain('is_visible')
    expect(result.reviews[0]?.isVisible).toBe(false)
  })
})
