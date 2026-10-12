import { describe, expect, it } from 'vitest'
import { starFill } from './rating-stars'

describe('starFill', () => {
  it('renders 4.5 as four full stars and one half', () => {
    expect([1, 2, 3, 4, 5].map((n) => starFill(4.5, n))).toEqual([1, 1, 1, 1, 0.5])
  })
  it('rounds to the nearest half', () => {
    expect([1, 2, 3, 4, 5].map((n) => starFill(4.24, n))).toEqual([1, 1, 1, 1, 0])
    expect([1, 2, 3, 4, 5].map((n) => starFill(4.26, n))).toEqual([1, 1, 1, 1, 0.5])
  })
})
