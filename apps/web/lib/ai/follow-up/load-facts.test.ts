import { describe, expect, it, vi } from 'vitest'
import { AiError } from '../errors'
import { loadFollowUpFacts, toFollowUpFacts } from './load-facts'
import { getPendingFollowUps, toPendingFollowUp } from './pending'

const ROW = {
  id: '00000000-0000-0000-00c0-000000000101',
  quote_number: 'MG-0007',
  status: 'sent',
  sent_at: '2026-10-05T16:00:00Z',
  valid_until: '2026-10-30T00:00:00Z',
  clients: { name: 'Laura Treviño' },
  quote_items: [{ description: 'Cancel de baño templado · 0.90 × 1.80 m' }, { description: 'Espejo a la medida' }, { description: '' }],
}

interface Recorder {
  readonly calls: { readonly method: string; readonly args: readonly unknown[] }[]
  readonly db: never
}

function recordingDb(result: unknown): Recorder {
  const calls: { method: string; args: unknown[] }[] = []
  const chain: Record<string, unknown> = {}
  for (const method of ['from', 'select', 'eq', 'in', 'lt', 'order', 'limit']) {
    chain[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args })
      return chain
    })
  }
  const error = result === 'db-error' ? { code: '57014', message: 'contenido sensible' } : null
  const data = error ? null : result
  chain.maybeSingle = vi.fn(async () => ({ data, error }))
  chain.then = (resolve: (value: unknown) => void) => resolve({ data, error })
  return { calls, db: chain as never }
}

describe('datos para el seguimiento', () => {
  it('toma cliente y hasta 3 partidas, sin montos', () => {
    expect(toFollowUpFacts(ROW)).toEqual({
      quoteId: ROW.id,
      quoteNumber: 'MG-0007',
      status: 'sent',
      sentAt: '2026-10-05T16:00:00Z',
      validUntil: '2026-10-30T00:00:00Z',
      clientName: 'Laura Treviño',
      itemSummaries: ['Cancel de baño templado · 0.90 × 1.80 m', 'Espejo a la medida'],
    })
    expect(toFollowUpFacts({ id: 'x' })).toBeNull()
  })

  it('arma la fila de pendientes con los días', () => {
    expect(toPendingFollowUp(ROW, new Date('2026-10-13T18:00:00Z'))).toEqual({ id: ROW.id, quoteNumber: 'MG-0007', clientName: 'Laura Treviño', days: 8 })
  })

  it('carga la cotización con columnas explícitas, sin correo ni teléfono, acotada y de la empresa', async () => {
    const { db, calls } = recordingDb(ROW)
    const facts = await loadFollowUpFacts(db, 'org-1', ROW.id)
    expect(facts?.quoteNumber).toBe('MG-0007')
    const select = String(calls.find((c) => c.method === 'select')?.args[0])
    expect(select).not.toContain('*')
    expect(select).not.toMatch(/email|phone/)
    expect(calls).toContainEqual({ method: 'eq', args: ['organization_id', 'org-1'] })
    expect(calls.some((c) => c.method === 'limit')).toBe(true)
  })

  it('una cotización que la RLS no deja ver es null', async () => {
    expect(await loadFollowUpFacts(recordingDb(null).db, 'org-1', ROW.id)).toBeNull()
  })

  it('un error de base de datos lanza unavailable en vez de parecer un 404', async () => {
    await expect(loadFollowUpFacts(recordingDb('db-error').db, 'org-1', ROW.id)).rejects.toBeInstanceOf(AiError)
  })

  it('un error al listar pendientes da lista vacía sin romper Inicio', async () => {
    expect(await getPendingFollowUps(recordingDb('db-error').db, 'org-1', new Date())).toEqual([])
  })

  it('los pendientes filtran enviadas o vistas con más de 48 h, de la más antigua a la más nueva', async () => {
    const now = new Date('2026-10-13T18:00:00Z')
    const { db, calls } = recordingDb([])
    await getPendingFollowUps(db, 'org-1', now)
    expect(calls).toContainEqual({ method: 'in', args: ['status', ['sent', 'viewed']] })
    expect(calls).toContainEqual({ method: 'lt', args: ['sent_at', '2026-10-11T18:00:00.000Z'] })
    expect(calls).toContainEqual({ method: 'order', args: ['sent_at', { ascending: true }] })
  })

  it('los pendientes salen en una sola consulta acotada a 5 y filtrada por empresa', async () => {
    const { db, calls } = recordingDb([{ id: ROW.id, quote_number: 'MG-0007', sent_at: ROW.sent_at, clients: { name: 'Laura Treviño' } }])
    const items = await getPendingFollowUps(db, 'org-1', new Date('2026-10-13T18:00:00Z'))
    expect(items).toEqual([{ id: ROW.id, quoteNumber: 'MG-0007', clientName: 'Laura Treviño', days: 8 }])
    expect(calls.filter((c) => c.method === 'from')).toHaveLength(1)
    expect(calls).toContainEqual({ method: 'limit', args: [5] })
    expect(calls).toContainEqual({ method: 'eq', args: ['organization_id', 'org-1'] })
  })
})
