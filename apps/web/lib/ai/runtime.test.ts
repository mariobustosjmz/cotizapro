import { afterEach, describe, expect, it, vi } from 'vitest'

const RUNTIME_KEY = Symbol.for('cotizapro.aiRuntime')

afterEach(() => {
  delete (globalThis as Record<symbol, unknown>)[RUNTIME_KEY]
  vi.resetModules()
})

describe('aiRuntime', () => {
  it('regresa siempre la misma instancia', async () => {
    const { aiRuntime } = await import('./runtime')
    expect(aiRuntime()).toBe(aiRuntime())
  })

  it('comparte la instancia entre copias del módulo (HMR o rutas separadas)', async () => {
    const first = (await import('./runtime')).aiRuntime()
    vi.resetModules()
    const second = (await import('./runtime')).aiRuntime()
    expect(second).toBe(first)
    expect(second.deps.queue).toBe(first.deps.queue)
  })

  it('usa la URL por omisión del plan si AI_BASE_URL no está definida', async () => {
    vi.stubEnv('AI_BASE_URL', '')
    const { aiRuntime } = await import('./runtime')
    expect(aiRuntime().config.baseUrl).toBe('http://ollama:11434/v1')
    vi.unstubAllEnvs()
  })
})

describe('aiRuntime afterSuccess', () => {
  it('se resuelve dentro del tope aunque el envío nunca termine y no rechaza', async () => {
    vi.useFakeTimers()
    vi.doMock('./alerts', () => ({ notifyUsageThreshold: () => new Promise<void>(() => undefined) }))
    const { aiRuntime } = await import('./runtime')
    const after = aiRuntime().deps.afterSuccess
    let settled = false
    const pending = after!({} as never, {} as never).then(() => {
      settled = true
    })
    await vi.advanceTimersByTimeAsync(4_900)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(200)
    await pending
    expect(settled).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
    vi.doUnmock('./alerts')
  })

  it('no rechaza si el envío falla', async () => {
    vi.doMock('./alerts', () => ({ notifyUsageThreshold: async () => { throw new Error('smtp') } }))
    const { aiRuntime } = await import('./runtime')
    await expect(aiRuntime().deps.afterSuccess!({} as never, {} as never)).resolves.toBeUndefined()
    vi.doUnmock('./alerts')
  })
})
