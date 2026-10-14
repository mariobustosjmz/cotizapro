import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { logger } from '@/lib/logger'
import type { AiCallResult } from './client'
import type { AiConfig } from './config'
import { AiError } from './errors'
import { createAiQueue } from './queue'
import { openAiRun, runAiFeature, textCall, type AiRunDeps } from './run'
import { fakeDb, type RpcCall } from './testing/fake-db'
import { RESERVATION_FIXTURE, SUMMARY_FIXTURE } from './testing/fixtures'

const config: AiConfig = { baseUrl: 'http://fake/v1', model: 'gemma3:4b', timeoutMs: 1000, keepAlive: '30m', limitsEnforced: true }

function setup(fetchImpl?: typeof fetch, now?: () => number) {
  const fake = fakeDb({
    ai_reserve: () => ({ data: RESERVATION_FIXTURE, error: null }),
    ai_finish: () => ({ data: true, error: null }),
    ai_usage_summary: () => ({ data: SUMMARY_FIXTURE, error: null }),
  })
  const afterSuccess = vi.fn(async () => undefined)
  const deps: AiRunDeps = { client: { config, fetchImpl, now }, queue: createAiQueue({ maxWaiting: 6, waitTimeoutMs: 1000 }), afterSuccess }
  return { ...fake, deps, afterSuccess }
}

const ok = <T,>(value: T) => async (): Promise<AiCallResult<T>> => ({ value, usage: { promptTokens: 10, completionTokens: 5 }, latencyMs: 120 })
const finishes = (calls: readonly RpcCall[]) => calls.filter((c) => c.fn === 'ai_finish').map((c) => c.args.p_ok)
const settleWithin = <T,>(promise: Promise<T>, ms: number): Promise<T | 'colgado'> =>
  Promise.race([promise, new Promise<'colgado'>((resolve) => setTimeout(() => resolve('colgado'), ms))])

let info: MockInstance<typeof logger.info>
let warn: MockInstance<typeof logger.warn>

beforeEach(() => {
  info = vi.spyOn(logger, 'info').mockImplementation(() => undefined)
  warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('runAiFeature', () => {
  it('cobra solo al terminar bien y avisa con el resumen', async () => {
    const t = setup()
    await expect(runAiFeature('describe_item', { db: t.db, organizationId: 'org-1' }, t.deps, ok('texto'))).resolves.toBe('texto')
    expect(t.calls[0]).toEqual({ fn: 'ai_reserve', args: { p_feature: 'describe_item', p_credits: 2 } })
    expect(t.calls.find((c) => c.fn === 'ai_finish')?.args).toMatchObject({ p_ok: true, p_prompt_tokens: 10, p_latency_ms: 120 })
    await vi.waitFor(() => expect(t.afterSuccess).toHaveBeenCalledWith(t.db, SUMMARY_FIXTURE))
  })

  it('un error de la IA reembolsa', async () => {
    const t = setup()
    const failing = async (): Promise<AiCallResult<string>> => {
      throw new AiError('timeout')
    }
    await expect(runAiFeature('rewrite', { db: t.db, organizationId: 'org-1' }, t.deps, failing)).rejects.toMatchObject({ code: 'timeout' })
    expect(finishes(t.calls)).toEqual([false])
    expect(t.afterSuccess).not.toHaveBeenCalled()
  })

  it('sin cupo no llama a la IA', async () => {
    const fake = fakeDb({ ai_reserve: () => ({ data: null, error: { message: 'ai_quota_exceeded' } }) })
    const call = vi.fn(ok('x'))
    const deps: AiRunDeps = { client: { config }, queue: createAiQueue({ maxWaiting: 6, waitTimeoutMs: 1000 }) }
    await expect(runAiFeature('rewrite', { db: fake.db, organizationId: 'org-1' }, deps, call)).rejects.toMatchObject({ code: 'quota_exceeded' })
    expect(call).not.toHaveBeenCalled()
  })

  it('la cola ocupada reembolsa la segunda petición de la misma empresa (doble clic)', async () => {
    const t = setup()
    let release: () => void = () => undefined
    const slow = () =>
      new Promise<AiCallResult<string>>((resolve) => {
        release = () => resolve({ value: 'uno', usage: { promptTokens: null, completionTokens: null }, latencyMs: 5 })
      })
    const first = runAiFeature('describe_item', { db: t.db, organizationId: 'org-1' }, t.deps, slow)
    await vi.waitFor(() => expect(t.deps.queue.stats().running).toBe(1))
    await expect(runAiFeature('describe_item', { db: t.db, organizationId: 'org-1' }, t.deps, ok('dos'))).rejects.toMatchObject({ code: 'busy' })
    release()
    await expect(first).resolves.toBe('uno')
    expect(finishes(t.calls)).toEqual([false, true])
  })

  it('una desconexión a mitad de la llamada reembolsa', async () => {
    const t = setup()
    const controller = new AbortController()
    const call = (signal: AbortSignal | undefined) =>
      new Promise<AiCallResult<string>>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('cliente cerró', 'AbortError')))
      })
    const run = runAiFeature('follow_up', { db: t.db, organizationId: 'org-1', signal: controller.signal }, t.deps, call)
    await vi.waitFor(() => expect(t.deps.queue.stats().running).toBe(1))
    controller.abort()
    await expect(run).rejects.toMatchObject({ code: 'timeout' })
    expect(finishes(t.calls)).toEqual([false])
  })
})

describe('textCall', () => {
  const sse = (content: string): Response =>
    new Response(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`, { headers: { 'Content-Type': 'text/event-stream' } })

  it('limpia el preámbulo en vivo y en el texto final', async () => {
    const t = setup(vi.fn<typeof fetch>(async () => sse('¡Claro! Aquí tienes:\nCancel templado.')))
    const seen: string[] = []
    const text = await runAiFeature('describe_item', { db: t.db, organizationId: 'org-1' }, t.deps, textCall(t.deps, 'describe_item', [], (d) => seen.push(d)))
    expect(text).toBe('Cancel templado.')
    expect(seen.join('')).toBe('Cancel templado.')
  })

  it('si solo había preámbulo es salida inválida y no cobra', async () => {
    const t = setup(vi.fn<typeof fetch>(async () => sse('¡Claro! Aquí tienes:')))
    const call = textCall(t.deps, 'describe_item', [], () => undefined)
    await expect(runAiFeature('describe_item', { db: t.db, organizationId: 'org-1' }, t.deps, call)).rejects.toMatchObject({ code: 'invalid_output' })
    expect(finishes(t.calls)).toEqual([false])
  })
})

describe('hallazgos de revisión', () => {
  const ctxOf = (t: ReturnType<typeof setup>, signal?: AbortSignal) => ({ db: t.db, organizationId: 'org-1', signal })

  it('si afterSuccess falla, la respuesta llega y se cobra una sola vez', async () => {
    const t = setup()
    const deps: AiRunDeps = { ...t.deps, afterSuccess: vi.fn(async () => Promise.reject(new Error('smtp caído'))) }
    await expect(runAiFeature('rewrite', ctxOf(t), deps, ok('listo'))).resolves.toBe('listo')
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith('ai after-success hook failed', expect.anything()))
    expect(finishes(t.calls)).toEqual([true])
  })

  it('si afterSuccess lanza en sincronía, la respuesta llega y se cobra una sola vez', async () => {
    const t = setup()
    const deps: AiRunDeps = {
      ...t.deps,
      afterSuccess: () => {
        throw new Error('sync')
      },
    }
    await expect(runAiFeature('rewrite', ctxOf(t), deps, ok('listo'))).resolves.toBe('listo')
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith('ai after-success hook failed', expect.anything()))
    expect(finishes(t.calls)).toEqual([true])
  })

  it('nada que falle después de cobrar provoca un segundo cierre como fallido', async () => {
    const t = setup()
    info.mockImplementation(() => {
      throw new Error('logger roto')
    })
    await expect(runAiFeature('rewrite', ctxOf(t), t.deps, ok('listo'))).resolves.toBe('listo')
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith('ai after-success hook failed', expect.anything()))
    expect(finishes(t.calls)).toEqual([true])
  })

  it('si el resumen de uso falla, no se llama a afterSuccess y la respuesta llega', async () => {
    const fake = fakeDb({
      ai_reserve: () => ({ data: RESERVATION_FIXTURE, error: null }),
      ai_usage_summary: () => ({ data: null, error: { message: 'boom' } }),
    })
    const afterSuccess = vi.fn(async () => undefined)
    const deps: AiRunDeps = { client: { config }, queue: createAiQueue({ maxWaiting: 6, waitTimeoutMs: 1000 }), afterSuccess }
    await expect(runAiFeature('rewrite', { db: fake.db, organizationId: 'org-1' }, deps, ok('listo'))).resolves.toBe('listo')
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith('ai after-success hook failed', expect.anything()))
    expect(finishes(fake.calls)).toEqual([true])
    expect(afterSuccess).not.toHaveBeenCalled()
  })

  it('si la reserva falla (tope diario) openAiRun rechaza antes de abrir el stream y no cierra nada', async () => {
    const fake = fakeDb({ ai_reserve: () => ({ data: null, error: { message: 'ai_daily_cap' } }) })
    const deps: AiRunDeps = { client: { config }, queue: createAiQueue({ maxWaiting: 6, waitTimeoutMs: 1000 }) }
    await expect(openAiRun('rewrite', { db: fake.db, organizationId: 'org-1' }, deps)).rejects.toMatchObject({ code: 'daily_cap' })
    expect(fake.calls.map((c) => c.fn)).toEqual(['ai_reserve'])
  })

  it('una corrida no se puede reutilizar ni cerrar dos veces', async () => {
    const t = setup()
    const run = await openAiRun('rewrite', ctxOf(t), t.deps)
    await expect(run.execute(ok('uno'))).resolves.toBe('uno')
    const second = vi.fn(ok('dos'))
    await expect(run.execute(second)).rejects.toMatchObject({ code: 'invalid_input' })
    expect(second).not.toHaveBeenCalled()
    expect(finishes(t.calls)).toEqual([true])
  })

  it('la desconexión del cliente no se reporta ni se registra como tiempo agotado del proveedor', async () => {
    const t = setup()
    const controller = new AbortController()
    const call = (signal: AbortSignal | undefined) =>
      new Promise<AiCallResult<string>>((_resolve, reject) => {
        signal?.addEventListener('abort', () => reject(new DOMException('cliente cerró', 'AbortError')))
      })
    const run = runAiFeature('follow_up', ctxOf(t, controller.signal), t.deps, call)
    await vi.waitFor(() => expect(t.deps.queue.stats().running).toBe(1))
    controller.abort()
    await expect(run).rejects.toMatchObject({ code: 'timeout', message: 'client_disconnect' })
    expect(finishes(t.calls)).toEqual([false])
    expect(warn).not.toHaveBeenCalledWith('ai feature failed', expect.anything())
    expect(info).toHaveBeenCalledWith('ai feature cancelled by client', expect.objectContaining({ feature: 'follow_up' }))
  })

  it('un tiempo agotado real del proveedor sí se registra como falla', async () => {
    const t = setup()
    const timeout = async (): Promise<AiCallResult<string>> => {
      throw new DOMException('se agotó', 'TimeoutError')
    }
    await expect(runAiFeature('rewrite', ctxOf(t, new AbortController().signal), t.deps, timeout)).rejects.toMatchObject({ code: 'timeout', message: 'TimeoutError' })
    expect(warn).toHaveBeenCalledWith('ai feature failed', expect.objectContaining({ code: 'timeout' }))
    expect(finishes(t.calls)).toEqual([false])
  })

  it('si el cliente se fue antes de que tocara su turno, no se llama a la IA ni se cobra', async () => {
    const t = setup()
    const controller = new AbortController()
    controller.abort()
    const call = vi.fn(ok('x'))
    await expect(runAiFeature('rewrite', ctxOf(t, controller.signal), t.deps, call)).rejects.toMatchObject({ message: 'client_disconnect' })
    expect(call).not.toHaveBeenCalled()
    expect(finishes(t.calls)).toEqual([false])
  })

  it('si el cliente se fue justo cuando la IA terminó, no se cobra', async () => {
    const t = setup()
    const controller = new AbortController()
    const call = async (): Promise<AiCallResult<string>> => {
      controller.abort()
      return { value: 'tarde', usage: { promptTokens: 1, completionTokens: 1 }, latencyMs: 3 }
    }
    await expect(runAiFeature('rewrite', ctxOf(t, controller.signal), t.deps, call)).rejects.toMatchObject({ message: 'client_disconnect' })
    expect(finishes(t.calls)).toEqual([false])
    expect(t.afterSuccess).not.toHaveBeenCalled()
  })
})

describe('revisión, ronda 1', () => {
  it('un afterSuccess colgado no retrasa la respuesta', async () => {
    const t = setup()
    const deps: AiRunDeps = { ...t.deps, afterSuccess: () => new Promise<void>(() => undefined) }
    expect(await settleWithin(runAiFeature('rewrite', { db: t.db, organizationId: 'org-1' }, deps, ok('listo')), 200)).toBe('listo')
    expect(finishes(t.calls)).toEqual([true])
  })

  it('el registro de éxito no usa llaves que el logger redacta ("token")', async () => {
    const t = setup()
    await runAiFeature('rewrite', { db: t.db, organizationId: 'org-1' }, t.deps, ok('listo'))
    const entry = info.mock.calls.find(([message]) => message === 'ai feature ok')
    const context = entry?.[1] ?? {}
    expect(Object.keys(context).filter((key) => key.toLowerCase().includes('token'))).toEqual([])
    expect(context).toMatchObject({ promptTok: 10, outputTok: 5, latencyMs: 120 })
  })

  it('la latencia de una falla se mide desde que la cola da el turno; la espera va aparte', async () => {
    let clock = 0
    const t = setup(undefined, () => clock)
    let release: () => void = () => undefined
    const slow = () =>
      new Promise<AiCallResult<string>>((resolve) => {
        release = () => resolve({ value: 'uno', usage: { promptTokens: null, completionTokens: null }, latencyMs: 5 })
      })
    const failsAfterWork = async (): Promise<AiCallResult<string>> => {
      clock = 5300
      throw new DOMException('se agotó', 'TimeoutError')
    }
    const first = runAiFeature('rewrite', { db: t.db, organizationId: 'org-a' }, t.deps, slow)
    await vi.waitFor(() => expect(t.deps.queue.stats().running).toBe(1))
    clock = 1000
    const second = runAiFeature('rewrite', { db: t.db, organizationId: 'org-b' }, t.deps, failsAfterWork)
    await vi.waitFor(() => expect(t.deps.queue.stats().waiting).toBe(1))
    clock = 5000
    release()
    await expect(first).resolves.toBe('uno')
    await expect(second).rejects.toMatchObject({ code: 'timeout' })
    expect(t.calls.find((c) => c.fn === 'ai_finish' && c.args.p_ok === false)?.args.p_latency_ms).toBe(300)
    expect(warn).toHaveBeenCalledWith('ai feature failed', expect.objectContaining({ code: 'timeout', waitMs: 4000 }))
  })

  it('si la cola rechaza (sin turno), la latencia del proveedor es 0', async () => {
    let clock = 0
    const t = setup(undefined, () => clock)
    let release: () => void = () => undefined
    const slow = () =>
      new Promise<AiCallResult<string>>((resolve) => {
        release = () => resolve({ value: 'uno', usage: { promptTokens: null, completionTokens: null }, latencyMs: 5 })
      })
    const first = runAiFeature('rewrite', { db: t.db, organizationId: 'org-1' }, t.deps, slow)
    await vi.waitFor(() => expect(t.deps.queue.stats().running).toBe(1))
    clock = 700
    await expect(runAiFeature('rewrite', { db: t.db, organizationId: 'org-1' }, t.deps, ok('dos'))).rejects.toMatchObject({ code: 'busy' })
    expect(t.calls.find((c) => c.fn === 'ai_finish' && c.args.p_ok === false)?.args.p_latency_ms).toBe(0)
    release()
    await first
  })
})

describe('textCall: valor final', () => {
  const sseChunks = (pieces: readonly string[], done = true): Response =>
    new Response(
      pieces.map((content) => `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`).join('') + (done ? 'data: [DONE]\n\n' : ''),
      { headers: { 'Content-Type': 'text/event-stream' } },
    )

  it('el markdown partido entre fragmentos no sobrevive en el valor final', async () => {
    const t = setup(vi.fn<typeof fetch>(async () => sseChunks(['Cancel templado\n', 'de **8', ' mm** con herrajes'])))
    const seen: string[] = []
    const text = await runAiFeature('describe_item', { db: t.db, organizationId: 'org-1' }, t.deps, textCall(t.deps, 'describe_item', [], (d) => seen.push(d)))
    expect(seen.join('')).toContain('**')
    expect(text).toBe('Cancel templado\nde 8 mm con herrajes')
    expect(finishes(t.calls)).toEqual([true])
  })

  it('recorta al límite por contexto cuando se pide uno menor', async () => {
    const t = setup(vi.fn<typeof fetch>(async () => sseChunks(['a'.repeat(50)])))
    const seen: string[] = []
    const text = await runAiFeature('rewrite', { db: t.db, organizationId: 'org-1' }, t.deps, textCall(t.deps, 'rewrite', [], (d) => seen.push(d), 20))
    expect(text).toBe('a'.repeat(20))
    expect(seen.join('')).toBe('a'.repeat(20))
    expect(finishes(t.calls)).toEqual([true])
  })

  it('un límite mayor al de la función no lo amplía', async () => {
    const t = setup(vi.fn<typeof fetch>(async () => sseChunks(['a'.repeat(3000)])))
    const text = await runAiFeature('rewrite', { db: t.db, organizationId: 'org-1' }, t.deps, textCall(t.deps, 'rewrite', [], () => undefined, 5000))
    expect(text.length).toBe(2400)
  })

  it('un stream cortado a la mitad no cobra', async () => {
    const t = setup(vi.fn<typeof fetch>(async () => sseChunks(['Cancel templado\n', 'de 8 mm'], false)))
    const call = textCall(t.deps, 'describe_item', [], () => undefined)
    await expect(runAiFeature('describe_item', { db: t.db, organizationId: 'org-1' }, t.deps, call)).rejects.toMatchObject({ code: 'unavailable' })
    expect(finishes(t.calls)).toEqual([false])
  })
})
