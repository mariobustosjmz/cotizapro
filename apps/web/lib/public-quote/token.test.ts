import { afterEach, describe, expect, it, vi } from 'vitest'
import { isPublicQuoteToken, publicQuoteUrl } from './token'

const TOKEN = 'a'.repeat(64)

describe('isPublicQuoteToken', () => {
  it('acepta 64 caracteres hex en minúsculas', () => {
    expect(isPublicQuoteToken(TOKEN)).toBe(true)
  })

  it.each(['a'.repeat(63), 'A'.repeat(64), `${'a'.repeat(63)}g`, '', null, 42])('rechaza %s', (value) => {
    expect(isPublicQuoteToken(value)).toBe(false)
  })
})

describe('publicQuoteUrl', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('usa NEXT_PUBLIC_APP_URL sin diagonal final', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.cotizapro.mx/')
    expect(publicQuoteUrl(TOKEN, 'http://localhost:3100')).toBe(`https://app.cotizapro.mx/c/${TOKEN}`)
  })

  it('sin variable usa el origen de la petición', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    expect(publicQuoteUrl(TOKEN, 'http://localhost:3100')).toBe(`http://localhost:3100/c/${TOKEN}`)
  })
})
