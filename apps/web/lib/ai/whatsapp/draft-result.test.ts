import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/logger'
import { buildDraftResult, type DraftDb } from './draft-result'
import type { DraftExtraction } from './types'

const SERVICE_ID = '00000000-0000-0000-00c0-000000000201'
const CLIENT_ID = '00000000-0000-0000-00c0-000000000301'

interface QueryLog {
  readonly table: string
  readonly ops: ReadonlyArray<readonly [string, ...unknown[]]>
}

interface FakeOptions {
  readonly clients?: unknown
  readonly clientsError?: { message: string } | null
  readonly rpcRows?: unknown
  readonly throwOnFrom?: boolean
}

function fakeSupabase(options: FakeOptions = {}) {
  const queries: QueryLog[] = []
  const rpcCalls: Array<{ fn: string; args: unknown }> = []
  const from = (table: string) => {
    if (options.throwOnFrom) throw new Error('red caída')
    const ops: Array<readonly [string, ...unknown[]]> = []
    queries.push({ table, ops })
    const result = { data: options.clients ?? [], error: options.clientsError ?? null }
    const builder = {
      select: (...args: unknown[]) => (ops.push(['select', ...args]), builder),
      eq: (...args: unknown[]) => (ops.push(['eq', ...args]), builder),
      order: (...args: unknown[]) => (ops.push(['order', ...args]), builder),
      limit: (...args: unknown[]) => (ops.push(['limit', ...args]), Promise.resolve(result)),
      insert: (...args: unknown[]) => (ops.push(['insert', ...args]), builder),
      update: (...args: unknown[]) => (ops.push(['update', ...args]), builder),
    }
    return builder
  }
  const rpc = async (fn: string, args: unknown) => {
    rpcCalls.push({ fn, args })
    return { data: options.rpcRows ?? [], error: null }
  }
  return { db: { from, rpc } as unknown as DraftDb, queries, rpcCalls }
}

const extraction: DraftExtraction = {
  client: { name: 'Laura Treviño', phone: '8123456789', email: null, zone: 'San Nicolás' },
  items: [
    { concept: 'Cancel de baño templado 9 mm', quantity: 1, widthM: 0.9, heightM: 1.8, notes: 'corredizo' },
    { concept: 'Mosquitero de fibra', quantity: 2, widthM: 1.2, heightM: 1.5, notes: null },
  ],
  notes: 'Quiere instalación el sábado',
}

beforeEach(() => {
  vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('buildDraftResult', () => {
  it('liga el catálogo y propone un cliente nuevo cuando no existe', async () => {
    const fake = fakeSupabase({ rpcRows: [{ term_index: 0, service_id: SERVICE_ID, service_name: 'Cancel de baño templado', score: 0.7 }] })
    const result = await buildDraftResult(fake.db, 'org-1', extraction)
    expect(result).toEqual({
      client: { kind: 'new', client: extraction.client },
      items: [
        { ...extraction.items[0], serviceId: SERVICE_ID, serviceName: 'Cancel de baño templado' },
        { ...extraction.items[1], serviceId: null, serviceName: null },
      ],
      notes: 'Quiere instalación el sábado',
      zone: 'San Nicolás',
    })
  })

  it('una sola consulta de clientes, de la empresa, con columnas explícitas y límite; una sola RPC; nada se escribe', async () => {
    const fake = fakeSupabase()
    await buildDraftResult(fake.db, 'org-1', extraction)
    expect(fake.queries).toHaveLength(1)
    const [query] = fake.queries
    expect(query?.table).toBe('clients')
    expect(query?.ops).toContainEqual(['select', 'id, name, phone, whatsapp_phone'])
    expect(query?.ops).toContainEqual(['eq', 'organization_id', 'org-1'])
    expect(query?.ops.some(([op, n]) => op === 'limit' && typeof n === 'number' && n > 0 && n <= 1000)).toBe(true)
    expect(query?.ops.some(([op]) => op === 'insert' || op === 'update')).toBe(false)
    expect(fake.rpcCalls).toEqual([{ fn: 'ai_match_services', args: { p_terms: ['Cancel de baño templado 9 mm', 'Mosquitero de fibra'] } }])
  })

  it('liga un cliente existente por teléfono', async () => {
    const fake = fakeSupabase({ clients: [{ id: CLIENT_ID, name: 'Laura T.', phone: null, whatsapp_phone: '+52 1 81 2345 6789' }] })
    const result = await buildDraftResult(fake.db, 'org-1', extraction)
    expect(result.client).toEqual({ kind: 'existing', clientId: CLIENT_ID, name: 'Laura T.', matchedBy: 'phone' })
  })

  it('sin nombre ni teléfono en el mensaje no consulta clientes', async () => {
    const fake = fakeSupabase({ clients: [{ id: CLIENT_ID, name: 'Laura T.', phone: null, whatsapp_phone: null }] })
    const anonymous = { ...extraction, client: { name: null, phone: null, email: 'laura@example.com', zone: 'Cumbres' } }
    const result = await buildDraftResult(fake.db, 'org-1', anonymous)
    expect(fake.queries).toEqual([])
    expect(fake.rpcCalls).toHaveLength(1)
    expect(result.client).toEqual({ kind: 'none' })
    expect(result.zone).toBe('Cumbres')
  })

  it('si la consulta de clientes falla o lanza, no truena: queda como cliente nuevo', async () => {
    const failing = fakeSupabase({ clientsError: { message: 'boom' }, clients: null })
    expect((await buildDraftResult(failing.db, 'org-1', extraction)).client.kind).toBe('new')
    const throwing = fakeSupabase({ throwOnFrom: true })
    const result = await buildDraftResult(throwing.db, 'org-1', extraction)
    expect(result.client.kind).toBe('new')
    expect(result.items).toHaveLength(2)
  })

  it('descarta filas de clientes mal formadas', async () => {
    const fake = fakeSupabase({ clients: [{ id: 'no-uuid', name: 'Laura Treviño', phone: null, whatsapp_phone: null }] })
    expect((await buildDraftResult(fake.db, 'org-1', extraction)).client.kind).toBe('new')
  })

  it('el resultado no trae llaves de precio', async () => {
    const fake = fakeSupabase({ rpcRows: [{ term_index: 0, service_id: SERVICE_ID, service_name: 'Cancel', score: 0.7, unit_price: 999 }] })
    const result = await buildDraftResult(fake.db, 'org-1', extraction)
    expect(JSON.stringify(result)).not.toMatch(/price|precio|total|monto/)
  })
})
