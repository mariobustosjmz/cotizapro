import { describe, expect, it } from 'vitest'
import { createRunGuard } from './run-guard'

describe('createRunGuard', () => {
  it('no inicia una segunda ejecución mientras hay una activa', () => {
    const guard = createRunGuard()
    const first = guard.start()
    expect(first).not.toBeNull()
    expect(guard.start()).toBeNull()
    expect(guard.finish(first!)).toBe(true)
    expect(guard.start()).not.toBeNull()
  })

  it('finish de una ejecución que ya no es la actual no baja el estado', () => {
    const guard = createRunGuard()
    const first = guard.start()!
    guard.abortAll()
    const second = guard.start()!
    expect(first.signal.aborted).toBe(true)
    expect(guard.finish(first)).toBe(false)
    expect(guard.isActive()).toBe(true)
    expect(guard.finish(second)).toBe(true)
    expect(guard.isActive()).toBe(false)
  })
})
