import { describe, expect, it } from 'vitest'
import { LOGO_MAX_BYTES, checkLogoFile, logoStoragePath } from './logo'

describe('checkLogoFile', () => {
  it('acepta PNG, JPG y WebP de hasta 2 MB', () => {
    expect(checkLogoFile('image/png', 1000)).toEqual({ ok: true, ext: 'png' })
    expect(checkLogoFile('image/jpeg', LOGO_MAX_BYTES)).toEqual({ ok: true, ext: 'jpg' })
    expect(checkLogoFile('image/webp', 10)).toEqual({ ok: true, ext: 'webp' })
  })

  it('rechaza SVG, archivos vacíos y archivos de más de 2 MB', () => {
    expect(checkLogoFile('image/svg+xml', 1000)).toMatchObject({ ok: false, status: 415 })
    expect(checkLogoFile('image/png', 0)).toMatchObject({ ok: false, status: 400 })
    expect(checkLogoFile('image/png', LOGO_MAX_BYTES + 1)).toMatchObject({ ok: false, status: 413 })
  })
})

describe('logoStoragePath', () => {
  it('guarda dentro de la carpeta de la organización con nombre único', () => {
    expect(logoStoragePath('org-1', 'png', 123)).toBe('org-1/logo-123.png')
  })
})
