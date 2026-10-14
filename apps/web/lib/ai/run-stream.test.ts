import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { logger } from '@/lib/logger'
import type { AiConfig } from './config'
import { aiTextStreamResponse } from './http'
import { createAiQueue } from './queue'
import { openAiRun, textCall, type AiRunDeps } from './run'
import { fakeDb, type RpcCall } from './testing/fake-db'
import { RESERVATION_FIXTURE, SUMMARY_FIXTURE } from './testing/fixtures'

const config: AiConfig = { baseUrl: 'http://fake/v1', model: 'gemma3:4b', timeoutMs: 5000, keepAlive: '30m', limitsEnforced: true }
const encoder = new TextEncoder()
const chunk = (content: string): Uint8Array => encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`)
const finishes = (calls: readonly RpcCall[]) => calls.filter((c) => c.fn === 'ai_finish').map((c) => c.args.p_ok)

/** Ollama falso: manda un fragmento y se queda esperando hasta que alguien aborte la señal, como un fetch real. */
function hangingOllama() {
  const signals: AbortSignal[] = []
  const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
    const signal = init?.signal ?? undefined
    if (signal) signals.push(signal)
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk('Cancel templado\n'))
        signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')))
      },
    })
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } })
  })
  return { fetchImpl, signals }
}

function setup(fetchImpl: typeof fetch, afterSuccess?: AiRunDeps['afterSuccess']) {
  const fake = fakeDb({
    ai_reserve: () => ({ data: RESERVATION_FIXTURE, error: null }),
    ai_finish: () => ({ data: true, error: null }),
    ai_usage_summary: () => ({ data: SUMMARY_FIXTURE, error: null }),
  })
  const deps: AiRunDeps = { client: { config, fetchImpl }, queue: createAiQueue({ maxWaiting: 6, waitTimeoutMs: 1000 }), afterSuccess }
  return { ...fake, deps }
}

let info: MockInstance<typeof logger.info>

beforeEach(() => {
  info = vi.spyOn(logger, 'info').mockImplementation(() => undefined)
  vi.spyOn(logger, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ruta de texto de punta a punta (openAiRun + textCall + aiTextStreamResponse)', () => {
  it('si el cliente cancela a mitad del stream se aborta el fetch, no se cobra y la cola queda libre', async () => {
    const ollama = hangingOllama()
    const t = setup(ollama.fetchImpl)
    const abort = new AbortController()
    const run = await openAiRun('describe_item', { db: t.db, organizationId: 'org-1', signal: abort.signal }, t.deps)
    const res = aiTextStreamResponse((send) => run.execute(textCall(t.deps, 'describe_item', [], send)), () => abort.abort())
    const reader = res.body?.getReader()
    if (!reader) throw new Error('sin body')

    const first = await reader.read()
    expect(new TextDecoder().decode(first.value)).toBe('data: {"delta":"Cancel templado\\n"}\n\n')
    await reader.cancel()

    await vi.waitFor(() => expect(finishes(t.calls)).toEqual([false]))
    expect(ollama.signals).toHaveLength(1)
    expect(ollama.signals[0]?.aborted).toBe(true)
    await vi.waitFor(() => expect(t.deps.queue.stats()).toEqual({ running: 0, waiting: 0 }))
    expect(info).toHaveBeenCalledWith('ai feature cancelled by client', expect.objectContaining({ feature: 'describe_item' }))
    expect(info).not.toHaveBeenCalledWith('ai feature ok', expect.anything())
  })

  it('un afterSuccess colgado no retrasa el evento done', async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () => new Response(`${new TextDecoder().decode(chunk('Cancel templado.'))}data: [DONE]\n\n`, { headers: { 'Content-Type': 'text/event-stream' } }),
    )
    const t = setup(fetchImpl, () => new Promise<void>(() => undefined))
    const run = await openAiRun('describe_item', { db: t.db, organizationId: 'org-1' }, t.deps)
    const res = aiTextStreamResponse((send) => run.execute(textCall(t.deps, 'describe_item', [], send)), () => undefined)
    const body = await Promise.race([res.text(), new Promise<string>((resolve) => setTimeout(() => resolve('colgado'), 200))])
    expect(body).toBe('data: {"delta":"Cancel templado."}\n\ndata: {"done":true,"text":"Cancel templado."}\n\n')
    expect(finishes(t.calls)).toEqual([true])
  })
})
