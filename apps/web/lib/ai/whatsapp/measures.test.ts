import { describe, expect, it } from 'vitest'
import { inferUnit, normalizeItemMeasures, parseMeasure, parseQuantity, toMeters, tryParseQuantity } from './measures'

describe('medidas del mensaje', () => {
  it('lee número, decimales con coma y unidad', () => {
    expect(parseMeasure('1.80 mts')).toEqual({ value: 1.8, unit: 'm' })
    expect(parseMeasure('90cm.')).toEqual({ value: 90, unit: 'cm' })
    expect(parseMeasure('1,20 m')).toEqual({ value: 1.2, unit: 'm' })
    expect(parseMeasure(2)).toEqual({ value: 2, unit: null })
    expect(parseMeasure('abc')).toBeNull()
  })

  it('acepta unidades con y sin espacio, con acentos y en plural', () => {
    expect(parseMeasure('2 mts')).toEqual({ value: 2, unit: 'm' })
    expect(parseMeasure('2mts')).toEqual({ value: 2, unit: 'm' })
    expect(parseMeasure('2 Metros')).toEqual({ value: 2, unit: 'm' })
    expect(parseMeasure('90 centímetros')).toEqual({ value: 90, unit: 'cm' })
    expect(parseMeasure('900 milímetros')).toEqual({ value: 900, unit: 'mm' })
    expect(parseMeasure('  1.5  M ')).toEqual({ value: 1.5, unit: 'm' })
  })

  it('rechaza áreas, rangos, negativos, ceros y basura', () => {
    for (const bad of ['1.5 m2', '1.5 m²', '3 metros cuadrados', '2 a 3 m', '-2', '0', '0 cm', '', '   ', 'x', '3x2', '1e5', 'Infinity', 'NaN']) {
      expect(parseMeasure(bad)).toBeNull()
    }
    for (const bad of [-1, 0, NaN, Infinity, null, undefined, {}, [], true]) {
      expect(parseMeasure(bad)).toBeNull()
    }
  })

  it('deduce la unidad por el tamaño', () => {
    expect(inferUnit(1.8)).toBe('m')
    expect(inferUnit(90)).toBe('cm')
    expect(inferUnit(900)).toBe('mm')
    expect(toMeters(5000, 'mm')).toBe(5)
    expect(toMeters(30, 'm')).toBeNull()
    expect(toMeters(1, 'mm')).toBeNull()
  })

  it('convierte ancho y alto a metros (casos medidos con mensajes reales)', () => {
    expect(normalizeItemMeasures('90', '1.80')).toEqual({ widthM: 0.9, heightM: 1.8 })
    expect(normalizeItemMeasures('120', '150 cm')).toEqual({ widthM: 1.2, heightM: 1.5 })
    expect(normalizeItemMeasures('1,20 m', '900')).toEqual({ widthM: 1.2, heightM: 0.9 })
    expect(normalizeItemMeasures('900mm', '1800 mm')).toEqual({ widthM: 0.9, heightM: 1.8 })
    expect(normalizeItemMeasures('45', '45')).toEqual({ widthM: 0.45, heightM: 0.45 })
    expect(normalizeItemMeasures(null, '1.2')).toEqual({ widthM: null, heightM: 1.2 })
  })

  it('nunca devuelve NaN, negativos ni medidas fuera de 0.05 a 20 m', () => {
    expect(normalizeItemMeasures('nada', undefined)).toEqual({ widthM: null, heightM: null })
    expect(normalizeItemMeasures('-5', '999999')).toEqual({ widthM: null, heightM: null })
    expect(normalizeItemMeasures('25 m', '0.01 m')).toEqual({ widthM: null, heightM: null })
    expect(normalizeItemMeasures('2 mts', '3 a 4')).toEqual({ widthM: 2, heightM: null })
  })
})

describe('cantidades', () => {
  const q = (raw: unknown): number => parseQuantity(raw)

  it('entiende números y palabras', () => {
    expect(['dos', '3', 'un par', 'media docena', 0, 'x', 2.5, 900].map(parseQuantity)).toEqual([2, 3, 2, 6, 1, 1, 2.5, 500])
  })

  it('entiende español de México', () => {
    expect(q('tres minisplits')).toBe(3)
    expect(q('Una docena')).toBe(12)
    expect(q('un cancel')).toBe(1)
    expect(q('cinco')).toBe(5)
    expect(q('2 piezas')).toBe(2)
    expect(q('2 pzas')).toBe(2)
    expect(q('veinte')).toBe(20)
    expect(q('  DOS  ')).toBe(2)
  })

  it('maneja coma decimal, miles y rangos', () => {
    expect(q('2,5')).toBe(2.5)
    expect(q('2.5')).toBe(2.5)
    expect(q('1,200')).toBe(500)
    expect(q('1,5')).toBe(1.5)
    expect(q('2 a 3')).toBe(2)
    expect(q('dos a tres')).toBe(2)
    expect(q('2-3')).toBe(2)
  })

  it('dimensiones, negativos y basura caen en 1 o en el tope', () => {
    expect(q('3x2')).toBe(1)
    expect(q('-3')).toBe(1)
    expect(q(-3)).toBe(1)
    for (const bad of [NaN, Infinity, -Infinity, null, undefined, {}, [], true, '', 'varios', '1,2,3,4']) {
      expect(q(bad)).toBe(1)
    }
    expect(q(Number.MAX_VALUE)).toBe(500)
    expect(q('99999999999999999999')).toBe(500)
  })

  it('siempre devuelve un número finito entre 0 y 500, sin lanzar', () => {
    const odd = ['', ' ', '\n', '0,0', '..', ',,', '1..2', '١٢٣', '🙂', '9'.repeat(400), 'x'.repeat(1000), '1e999', '0.001']
    for (const raw of odd) {
      const n = q(raw)
      expect(Number.isFinite(n)).toBe(true)
      expect(n).toBeGreaterThan(0)
      expect(n).toBeLessThanOrEqual(500)
    }
  })
})

describe('ronda 1 de correcciones', () => {
  it('ancho y alto sin unidad comparten una sola unidad', () => {
    expect(normalizeItemMeasures('10', '11')).toEqual({ widthM: 0.1, heightM: 0.11 })
    expect(normalizeItemMeasures('9', '18')).toEqual({ widthM: null, heightM: null })
    expect(normalizeItemMeasures('12', '12')).toEqual({ widthM: 0.12, heightM: 0.12 })
    expect(normalizeItemMeasures('400', '401')).toEqual({ widthM: 4, heightM: 4.01 })
    expect(normalizeItemMeasures('0.9', '180')).toEqual({ widthM: 0.9, heightM: 1.8 })
    expect(normalizeItemMeasures(90, 1.8)).toEqual({ widthM: 0.9, heightM: 1.8 })
  })

  it('descarta proporciones mayores a 15 a 1', () => {
    expect(normalizeItemMeasures('1 m', '0.05')).toEqual({ widthM: null, heightM: null })
    expect(normalizeItemMeasures('1 m', '5 cm')).toEqual({ widthM: 1, heightM: 0.05 })
    expect(normalizeItemMeasures('3 m', '20 cm')).toEqual({ widthM: 3, heightM: 0.2 })
  })

  it('tryParseQuantity distingue 1 real de no entendido', () => {
    expect(tryParseQuantity('1')).toBe(1)
    expect(tryParseQuantity('varios')).toBeNull()
    expect(tryParseQuantity('0')).toBeNull()
    expect(tryParseQuantity('3x2')).toBeNull()
  })

  it('miles con punto, punto final y cadenas largas', () => {
    expect(parseQuantity('1.000')).toBe(500)
    expect(parseQuantity('1.200')).toBe(500)
    expect(parseQuantity('0.500')).toBe(0.5)
    expect(parseQuantity('0,500')).toBe(0.5)
    expect(parseQuantity('tres.')).toBe(3)
    expect(parseQuantity('2.')).toBe(2)
    expect(parseQuantity('3' + ' '.repeat(100) + 'x')).toBe(3)
    expect(parseQuantity(' '.repeat(50) + '4')).toBe(1)
    expect(parseMeasure('1' + ' '.repeat(60) + 'm')).toEqual({ value: 1, unit: null })
  })
})
