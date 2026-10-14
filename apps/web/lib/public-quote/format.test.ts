import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_TZ = process.env.TZ

async function loadFormat(): Promise<typeof import('./format')> {
  vi.resetModules()
  return import('./format')
}

describe('formatDateOnly', () => {
  beforeEach(() => {
    process.env.TZ = 'America/Mexico_City'
  })

  afterEach(() => {
    if (ORIGINAL_TZ === undefined) delete process.env.TZ
    else process.env.TZ = ORIGINAL_TZ
    vi.resetModules()
  })

  it('no recorre la fecha por la zona horaria de México', async () => {
    const { formatDateOnly } = await loadFormat()
    expect(formatDateOnly('2026-10-27')).toBe('27 de octubre de 2026')
  })

  it('regresa el texto original si no es fecha', async () => {
    const { formatDateOnly } = await loadFormat()
    expect(formatDateOnly('mañana')).toBe('mañana')
  })
})

describe('formatDateTime', () => {
  it('muestra la hora de Monterrey en formato de 24 horas', async () => {
    const { formatDateTime } = await loadFormat()
    const text = formatDateTime('2026-10-14T15:05:00Z')
    expect(text).toContain('14 de octubre de 2026')
    expect(text).toContain('09:05')
  })
})
