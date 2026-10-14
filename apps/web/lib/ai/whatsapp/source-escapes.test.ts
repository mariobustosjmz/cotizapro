import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMeasure } from './measures'
import { normalizeForMatch } from './normalize'

/** Marcas combinantes U+0300–U+036F escritas tal cual en el código fuente: invisibles en la revisión. */
const RAW_COMBINING = /[\u0300-\u036f]/

describe('rangos de acentos escritos con escapes', () => {
  it.each(['normalize.ts', 'measures.ts'])('%s no tiene marcas combinantes sueltas', (file) => {
    const source = readFileSync(join(__dirname, file), 'utf8')
    expect(RAW_COMBINING.test(source)).toBe(false)
    expect(source).toContain('\\u0300-\\u036f')
  })

  it('sigue quitando acentos igual', () => {
    expect(normalizeForMatch('Cancel de BAÑO 9mm')).toBe('cancel de bano 9 mm')
    expect(normalizeForMatch('Ventána corrédiza')).toBe('ventana corrediza')
    expect(parseMeasure('2 metros')).toEqual({ value: 2, unit: 'm' })
    expect(parseMeasure('90 centímetros')).toEqual({ value: 90, unit: 'cm' })
    expect(parseMeasure('5 milímetros')).toEqual({ value: 5, unit: 'mm' })
  })
})
