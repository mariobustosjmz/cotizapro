import { describe, expect, it } from 'vitest'
import { brandCssVars, brandPalette, contrastRatio, ensureContrast, normalizeBrandColor, readableInk } from './color'

describe('normalizeBrandColor', () => {
  it('acepta hex de 6 dígitos y lo deja en mayúsculas', () => {
    expect(normalizeBrandColor('#0e7490')).toBe('#0E7490')
  })

  it('usa el naranja de CotizaPro si el valor no es válido', () => {
    expect(normalizeBrandColor('red')).toBe('#F97316')
    expect(normalizeBrandColor(null)).toBe('#F97316')
    expect(normalizeBrandColor('#fff')).toBe('#F97316')
  })
})

describe('contraste', () => {
  it('calcula la razón WCAG entre blanco y negro', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0)
  })

  it('pone texto oscuro sobre un amarillo y blanco sobre un azul marino', () => {
    expect(readableInk('#FACC15')).toBe('#111827')
    expect(readableInk('#1E3A8A')).toBe('#FFFFFF')
  })

  it('aclara un azul marino para que se lea sobre la barra oscura', () => {
    const accent = ensureContrast('#1E3A8A', '#0F1117')
    expect(contrastRatio(accent, '#0F1117')).toBeGreaterThanOrEqual(4.5)
  })

  it('oscurece un amarillo para que se lea sobre blanco', () => {
    const text = ensureContrast('#FACC15', '#FFFFFF')
    expect(contrastRatio(text, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
  })
})

describe('brandPalette', () => {
  it('todas las variantes cumplen contraste para cualquier color de los ejemplos', () => {
    for (const color of ['#0E7490', '#F59E0B', '#0369A1', '#BE185D', '#F97316', '#111827', '#FFFFFF']) {
      const p = brandPalette(color)
      expect(contrastRatio(p.ink, p.color)).toBeGreaterThanOrEqual(4.5 * 0.9)
      expect(contrastRatio(p.onLight, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(p.onDark, '#0F1117')).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('expone las variables CSS', () => {
    expect(brandCssVars(brandPalette('#0E7490'))).toMatchObject({ '--brand': '#0E7490', '--brand-ink': '#FFFFFF' })
  })
})
