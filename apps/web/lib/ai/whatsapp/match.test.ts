import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { logger } from '@/lib/logger'
import { fakeDb } from '../testing/fake-db'
import { chooseCatalogMatch, MATCH_MAX_TERM_CHARS, MATCH_MAX_TERMS, matchServiceIds, normalizeForMatch, parseCandidates } from './match'

const cand = (serviceName: string, score: number) => ({ termIndex: 0, serviceId: `id-${serviceName}`, serviceName, score })
const SERVICE_ID = '00000000-0000-0000-00c0-000000000201'

beforeEach(() => {
  vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('coincidencias con el catálogo', () => {
  it('normaliza acentos, mayúsculas y números pegados', () => {
    expect(normalizeForMatch('Cancel de BAÑO 9mm')).toBe('cancel de bano 9 mm')
  })

  it('prefiere el nombre exacto, luego el que contiene, luego el puntaje', () => {
    const list = [cand('Vidrio a la medida', 0.9), cand('Cancel de baño templado', 0.4)]
    expect(chooseCatalogMatch('cancel de baño templado', list)?.serviceName).toBe('Cancel de baño templado')
    expect(chooseCatalogMatch('Cancel de baño templado 9 mm', [cand('Espejo a la medida', 0.5), cand('Cancel de baño templado', 0.45)])?.serviceName).toBe('Cancel de baño templado')
    expect(chooseCatalogMatch('ventana corrediza', [cand('Ventana de aluminio', 0.35), cand('Vidrio a la medida', 0.31)])?.serviceName).toBe('Ventana de aluminio')
    expect(chooseCatalogMatch('mosquitero', [])).toBeNull()
  })

  it('lee la respuesta de la RPC y descarta filas mal formadas', () => {
    const rows = [{ term_index: 1, service_id: SERVICE_ID, service_name: 'Espejo a la medida', score: 0.6 }, { term_index: 'x' }]
    expect(parseCandidates(rows)).toEqual([{ termIndex: 1, serviceId: SERVICE_ID, serviceName: 'Espejo a la medida', score: 0.6 }])
    expect(parseCandidates(null)).toEqual([])
  })
})

describe('matchServiceIds', () => {
  it('manda todos los conceptos en una sola llamada a la RPC y reparte por índice', async () => {
    const fake = fakeDb({
      ai_match_services: () => ({ data: [{ term_index: 1, service_id: SERVICE_ID, service_name: 'Espejo a la medida', score: 0.6 }], error: null }),
    })
    const result = await matchServiceIds(fake.db, ['Mosquitero', 'Espejo a la medida', 'Ventana'])
    expect(fake.calls).toEqual([{ fn: 'ai_match_services', args: { p_terms: ['Mosquitero', 'Espejo a la medida', 'Ventana'] } }])
    expect(result).toEqual([null, { termIndex: 1, serviceId: SERVICE_ID, serviceName: 'Espejo a la medida', score: 0.6 }, null])
  })

  it('acota la cantidad de términos y el largo de cada uno', async () => {
    const fake = fakeDb({ ai_match_services: () => ({ data: [], error: null }) })
    const concepts = Array.from({ length: 20 }, (_, i) => `${'x'.repeat(100)} ${i}`)
    const result = await matchServiceIds(fake.db, concepts)
    const terms = fake.calls[0]?.args.p_terms as readonly string[]
    expect(fake.calls).toHaveLength(1)
    expect(terms).toHaveLength(MATCH_MAX_TERMS)
    expect(MATCH_MAX_TERMS).toBe(15)
    expect(terms.every((term) => term.length <= MATCH_MAX_TERM_CHARS)).toBe(true)
    expect(result).toHaveLength(20)
  })

  it('sin conceptos no llama a la base', async () => {
    const fake = fakeDb({})
    expect(await matchServiceIds(fake.db, [])).toEqual([])
    expect(fake.calls).toHaveLength(0)
  })

  it('si la RPC falla o lanza, las partidas quedan sin coincidencia', async () => {
    const failing = fakeDb({ ai_match_services: () => ({ data: null, error: { message: 'boom' } }) })
    expect(await matchServiceIds(failing.db, ['Cancel', 'Espejo'])).toEqual([null, null])
    const throwing = fakeDb({
      ai_match_services: () => {
        throw new Error('red caída')
      },
    })
    expect(await matchServiceIds(throwing.db, ['Cancel'])).toEqual([null])
  })
})
