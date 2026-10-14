import { describe, expect, it } from 'vitest'
import { updateQuoteSchema } from './cotizapro'

describe('updateQuoteSchema · deposit_percent', () => {
  it.each([0, 30, 100, null])('acepta %s', (deposit_percent) => {
    expect(updateQuoteSchema.parse({ deposit_percent })).toEqual({ deposit_percent })
  })

  it.each([101, -1, 12.5])('rechaza %s', (deposit_percent) => {
    expect(updateQuoteSchema.safeParse({ deposit_percent }).success).toBe(false)
  })
})
