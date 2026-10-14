import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { ClientCandidate } from './client-match'
import { buildDraftResult, type DraftDb, type DraftResult } from './draft-result'
import { draftResultSchema } from './result-schema'
import type { DraftClient, DraftExtraction } from './types'

const SERVICE_ID = '00000000-0000-0000-00c0-000000000201'
const LAURA_ID = '00000000-0000-0000-00c0-000000000301'
const OTHER_ID = '00000000-0000-0000-00c0-000000000302'

/** Igual que useAiJson: la ruta responde `{ data }` y el navegador valida con el esquema. */
const envelope = z.object({ data: draftResultSchema })

function throughTheWire(data: DraftResult): unknown {
  return JSON.parse(JSON.stringify({ data }))
}

function fakeDb(clients: readonly ClientCandidate[]): DraftDb {
  const result = { data: clients, error: null }
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => Promise.resolve(result),
  }
  const rpc = async () => ({ data: [{ term_index: 0, service_id: SERVICE_ID, service_name: 'Cancel de baño templado', score: 0.7 }], error: null })
  return { from: () => builder, rpc } as unknown as DraftDb
}

const LAURA: DraftClient = { name: 'Laura Treviño', phone: '8123456789', email: null, zone: 'San Nicolás' }

function extraction(client: DraftClient): DraftExtraction {
  return {
    client,
    items: [
      { concept: 'Cancel de baño templado 9 mm', quantity: 1, widthM: 0.9, heightM: 1.8, notes: 'corredizo' },
      { concept: 'Mosquitero de fibra', quantity: 2, widthM: null, heightM: null, notes: null },
    ],
    notes: 'Quiere instalación el sábado',
  }
}

async function serverPayload(client: DraftClient, clients: readonly ClientCandidate[]): Promise<{ readonly server: DraftResult; readonly wire: unknown }> {
  const server = await buildDraftResult(fakeDb(clients), '00000000-0000-0000-00c0-000000000001', extraction(client))
  return { server, wire: throughTheWire(server) }
}

beforeEach(() => {
  vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('draftResultSchema acepta todo lo que manda el servidor', () => {
  it('cliente existente encontrado por teléfono (con matchedBy)', async () => {
    const { server, wire } = await serverPayload(LAURA, [{ id: LAURA_ID, name: 'Laura Treviño', phone: '81 2345 6789', whatsapp_phone: null }])
    expect(server.client).toEqual({ kind: 'existing', clientId: LAURA_ID, name: 'Laura Treviño', matchedBy: 'phone' })
    const parsed = envelope.safeParse(wire)
    expect(parsed.success).toBe(true)
    expect(parsed.data?.data).toEqual(server)
  })

  it('cliente existente encontrado por nombre', async () => {
    const { server, wire } = await serverPayload({ ...LAURA, phone: null }, [{ id: LAURA_ID, name: 'Laura Treviño', phone: null, whatsapp_phone: null }])
    expect(server.client).toMatchObject({ kind: 'existing', matchedBy: 'name' })
    expect(envelope.safeParse(wire).data?.data).toEqual(server)
  })

  it('ambiguo con un solo candidato', async () => {
    const { server, wire } = await serverPayload({ ...LAURA, name: 'Ana Gómez' }, [{ id: LAURA_ID, name: 'Laura Treviño', phone: '8123456789', whatsapp_phone: null }])
    expect(server.client).toEqual({ kind: 'ambiguous', client: { ...LAURA, name: 'Ana Gómez' }, candidates: [{ clientId: LAURA_ID, name: 'Laura Treviño' }] })
    expect(envelope.safeParse(wire).data?.data).toEqual(server)
  })

  it('ambiguo con varios candidatos', async () => {
    const { server, wire } = await serverPayload({ ...LAURA, phone: null, name: 'Laura' }, [
      { id: LAURA_ID, name: 'Laura', phone: null, whatsapp_phone: null },
      { id: OTHER_ID, name: 'Laura', phone: null, whatsapp_phone: null },
    ])
    expect(server.client).toMatchObject({ kind: 'ambiguous', candidates: [{ clientId: LAURA_ID }, { clientId: OTHER_ID }] })
    expect(envelope.safeParse(wire).data?.data).toEqual(server)
  })

  it('cliente nuevo', async () => {
    const { server, wire } = await serverPayload(LAURA, [])
    expect(server.client).toEqual({ kind: 'new', client: LAURA })
    expect(envelope.safeParse(wire).data?.data).toEqual(server)
  })

  it('sin cliente', async () => {
    const { server, wire } = await serverPayload({ name: null, phone: null, email: null, zone: null }, [])
    expect(server.client).toEqual({ kind: 'none' })
    expect(envelope.safeParse(wire).data?.data).toEqual(server)
  })

  it('las partidas sin coincidencia en el catálogo llegan con serviceId null', async () => {
    const { server, wire } = await serverPayload(LAURA, [])
    expect(server.items[1]).toMatchObject({ serviceId: null, serviceName: null })
    expect(envelope.safeParse(wire).data?.data.items).toEqual(server.items)
  })
})

describe('draftResultSchema rechaza lo que no es un borrador', () => {
  const base = { client: { kind: 'none' }, items: [], notes: null, zone: null }

  it('descarta campos de precio dentro de las partidas', () => {
    const item = { concept: 'Espejo', quantity: 1, widthM: null, heightM: null, notes: null, serviceId: null, serviceName: null, unit_price: 1 }
    const parsed = draftResultSchema.parse({ ...base, items: [item] })
    expect(parsed.items[0]).not.toHaveProperty('unit_price')
  })

  it('ambiguo sin candidatos o con más de 5 no es válido', () => {
    const client = LAURA
    const candidates = Array.from({ length: 6 }, (_, i) => ({ clientId: `c${i}`, name: `Cliente ${i}` }))
    expect(draftResultSchema.safeParse({ ...base, client: { kind: 'ambiguous', client, candidates: [] } }).success).toBe(false)
    expect(draftResultSchema.safeParse({ ...base, client: { kind: 'ambiguous', client, candidates } }).success).toBe(false)
  })

  it('existente con matchedBy desconocido no es válido', () => {
    const client = { kind: 'existing', clientId: LAURA_ID, name: 'Laura', matchedBy: 'correo' }
    expect(draftResultSchema.safeParse({ ...base, client }).success).toBe(false)
  })

  it('más de 15 partidas no es válido', () => {
    const item = { concept: 'Espejo', quantity: 1, widthM: null, heightM: null, notes: null, serviceId: null, serviceName: null }
    expect(draftResultSchema.safeParse({ ...base, items: Array.from({ length: 16 }, () => item) }).success).toBe(false)
  })
})
