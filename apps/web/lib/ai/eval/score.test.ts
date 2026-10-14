import { describe, expect, it } from 'vitest'
import { scoreCase, summarize } from './score'

const expected = {
  zone: 'San Nicolás',
  clientName: 'Laura Treviño',
  phone: '8123456789',
  items: [
    { concept: 'cancel', quantity: 1, widthM: 0.9, heightM: 1.8 },
    { concept: 'mosquitero', quantity: 2, widthM: 1.2, heightM: 1.5 },
  ],
}

const actual = {
  client: { name: 'Laura Treviño', phone: '8123456789', email: null, zone: 'San Nicolas' },
  items: [
    { concept: 'Cancel de baño templado 9 mm', quantity: 1, widthM: 0.9, heightM: 1.8, notes: null },
    { concept: 'Mosquitero de fibra', quantity: 2, widthM: 1.2, heightM: 1.5, notes: null },
  ],
  notes: null,
}

describe('scoreCase', () => {
  it('un caso perfecto vale 1 aunque la zona venga sin acento', () => {
    expect(scoreCase('c1', expected, actual, '{}')).toEqual({ id: 'c1', zone: true, client: true, items: true, measures: true, noPrice: true, score: 1 })
  })

  it('perder la zona o poner precio baja el puntaje', () => {
    const missed = scoreCase('c2', expected, { ...actual, client: { ...actual.client, zone: null } }, '{"partidas":[{"precio":1200}]}')
    expect(missed).toMatchObject({ zone: false, noPrice: false, score: 0.6 })
  })

  it('una medida fuera de tolerancia falla la revisión de medidas', () => {
    const wrong = { ...actual, items: [actual.items[0]!, { ...actual.items[1]!, widthM: 12 }] }
    expect(scoreCase('c3', expected, wrong, '{}').measures).toBe(false)
  })

  it('tolera hasta un centímetro de diferencia en medidas y exige cantidad exacta', () => {
    const close = { ...actual, items: [{ ...actual.items[0]!, widthM: 0.905 }, actual.items[1]!] }
    expect(scoreCase('c4', expected, close, '{}').measures).toBe(true)
    const wrongQty = { ...actual, items: [actual.items[0]!, { ...actual.items[1]!, quantity: 3 }] }
    expect(scoreCase('c5', expected, wrongQty, '{}').items).toBe(false)
  })

  it('ignora mayúsculas y acentos en el nombre del cliente', () => {
    const shouting = { ...actual, client: { ...actual.client, name: 'LAURA TREVINO' } }
    expect(scoreCase('c6', expected, shouting, '{}').client).toBe(true)
  })
})

describe('summarize', () => {
  it('pasa con promedio de 90 % o más', () => {
    const perfect = scoreCase('a', expected, actual, '{}')
    const weak = { ...perfect, id: 'b', score: 0.8, zone: false }
    expect(summarize([perfect, weak])).toEqual({ cases: 2, average: 0.9, zoneRate: 0.5, passed: true })
    expect(summarize([weak]).passed).toBe(false)
  })
})
