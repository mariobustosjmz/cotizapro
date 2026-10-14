import { describe, expect, it } from 'vitest'
import { aiButtonKind } from './button-state'

const ready = { available: true, remaining: 10, enforced: true, resetsOn: '2026-11-01', percent: 90 }

describe('aiButtonKind', () => {
  it('distingue carga, IA caída, sin créditos y listo', () => {
    expect(aiButtonKind(null, 2)).toBe('loading')
    expect(aiButtonKind({ ...ready, available: false }, 2)).toBe('unavailable')
    expect(aiButtonKind({ ...ready, remaining: 1 }, 2)).toBe('no_credits')
    expect(aiButtonKind(ready, 2)).toBe('ready')
  })

  it('con límites apagados no bloquea por créditos', () => {
    expect(aiButtonKind({ ...ready, remaining: 0, enforced: false }, 3)).toBe('ready')
  })
})
