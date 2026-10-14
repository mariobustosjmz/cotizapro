import { describe, expect, it } from 'vitest'
import { REWRITE_OUTPUT_LIMITS, exceedsRewriteLimit } from './rewrite-limits'

describe('REWRITE_OUTPUT_LIMITS', () => {
  it('respeta el máximo guardable de cada contexto', () => {
    expect(REWRITE_OUTPUT_LIMITS).toEqual({ quote_notes: 2000, quote_terms: 2400, review_reply: 900, free: 2400 })
  })

  it('notas con 2001 caracteres y respuestas con 901 exceden', () => {
    expect(exceedsRewriteLimit('a'.repeat(2000), 2000)).toBe(false)
    expect(exceedsRewriteLimit('a'.repeat(2001), 2000)).toBe(true)
    expect(exceedsRewriteLimit('a'.repeat(900), 900)).toBe(false)
    expect(exceedsRewriteLimit('a'.repeat(901), 900)).toBe(true)
  })
})
