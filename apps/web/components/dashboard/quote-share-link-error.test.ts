import { describe, expect, it } from 'vitest'
import { shareErrorMessage } from '@/hooks/use-quote-share-link'

describe('shareErrorMessage', () => {
  it('uses a fixed Spanish fallback for network errors', () => {
    expect(shareErrorMessage('loading', new TypeError('Failed to fetch'))).toBe('No se pudo consultar la liga')
    expect(shareErrorMessage('generating', new TypeError('Failed to fetch'))).toBe('No se pudo generar la liga')
    expect(shareErrorMessage('revoking', new Error('boom'))).toBe('No se pudo revocar la liga')
  })

  it('never exposes non-Error values', () => {
    expect(shareErrorMessage('generating', 'Failed to fetch')).toBe('No se pudo generar la liga')
  })
})
