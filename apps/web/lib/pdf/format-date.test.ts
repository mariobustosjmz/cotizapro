import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_TZ = process.env.TZ

async function load(): Promise<typeof import('./format-date')> {
  vi.resetModules()
  return import('./format-date')
}

describe('formatPdfDate', () => {
  beforeEach(() => {
    process.env.TZ = 'America/Mexico_City'
  })

  afterEach(() => {
    if (ORIGINAL_TZ === undefined) delete process.env.TZ
    else process.env.TZ = ORIGINAL_TZ
    vi.resetModules()
  })

  it('una fecha sin hora no se recorre un día', async () => {
    const { formatPdfDate } = await load()
    expect(formatPdfDate('2026-10-13')).toBe('13/10/2026')
  })

  it('un timestamp se muestra en hora de Monterrey', async () => {
    const { formatPdfDate } = await load()
    expect(formatPdfDate('2026-10-13T03:00:00Z')).toBe('12/10/2026')
  })
})
