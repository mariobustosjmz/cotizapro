import { z } from 'zod'
import type { AiConfig } from './config'
import { AiError, toAiError } from './errors'
import { parseJsonContent, parseOpenAiSse, readUsage } from './openai-format'

export interface AiMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

export interface AiUsage {
  readonly promptTokens: number | null
  readonly completionTokens: number | null
}

export interface AiCallResult<T> {
  readonly value: T
  readonly usage: AiUsage
  readonly latencyMs: number
}

export interface AiCallOptions {
  readonly temperature: number
  readonly maxTokens: number
  readonly signal?: AbortSignal
}

export interface AiClientDeps {
  readonly config: AiConfig
  readonly fetchImpl?: typeof fetch
  readonly now?: () => number
}

export const EMPTY_USAGE: AiUsage = { promptTokens: null, completionTokens: null }

const FIX_INSTRUCTION =
  'Tu respuesta anterior no cumple el formato. Responde solo con un objeto JSON válido con las claves pedidas, sin texto adicional.'

const completionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable().optional() }) })).optional(),
  usage: z.unknown().optional(),
})

const CHARS_PER_TOKEN_CAP = 8

function maxChars(opts: AiCallOptions): number {
  return opts.maxTokens * CHARS_PER_TOKEN_CAP
}

function addUsage(a: AiUsage, b: AiUsage): AiUsage {
  const sum = (x: number | null, y: number | null): number | null => (x === null && y === null ? null : (x ?? 0) + (y ?? 0))
  return { promptTokens: sum(a.promptTokens, b.promptTokens), completionTokens: sum(a.completionTokens, b.completionTokens) }
}

function requestBody(config: AiConfig, messages: readonly AiMessage[], opts: AiCallOptions, stream: boolean): string {
  return JSON.stringify({
    model: config.model,
    messages,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    stream,
    keep_alive: config.keepAlive,
    ...(stream ? { stream_options: { include_usage: true } } : { response_format: { type: 'json_object' } }),
  })
}

async function postChat(deps: AiClientDeps, body: string, signal: AbortSignal | undefined): Promise<Response> {
  const timeout = AbortSignal.timeout(deps.config.timeoutMs)
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
  try {
    const response = await (deps.fetchImpl ?? fetch)(`${deps.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: combined,
    })
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined)
      throw new AiError('unavailable', `http_${response.status}`)
    }
    return response
  } catch (error) {
    throw toAiError(error)
  }
}

async function readStream(
  body: ReadableStream<Uint8Array>,
  limit: number,
  onDelta: (delta: string) => void,
): Promise<{ text: string; usage: AiUsage }> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let usage: AiUsage = EMPTY_USAGE
  let ended = false
  let reading = true
  while (reading) {
    const { value, done } = await reader.read()
    const chunk = done ? decoder.decode() + '\n' : decoder.decode(value, { stream: true })
    const parsed = parseOpenAiSse(buffer + chunk)
    buffer = parsed.rest
    if (parsed.failed) throw await abortStream(reader, new AiError('unavailable', 'stream_error'))
    for (const piece of parsed.pieces) {
      if (piece.delta) {
        text += piece.delta
        onDelta(piece.delta)
      }
      if (piece.promptTokens !== null || piece.completionTokens !== null) {
        usage = { promptTokens: piece.promptTokens, completionTokens: piece.completionTokens }
      }
    }
    if (text.length > limit || buffer.length > limit) throw await abortStream(reader, new AiError('invalid_output', 'too_long'))
    ended = ended || parsed.done || parsed.finished
    if (done) reading = false
    else if (parsed.done) {
      await reader.cancel().catch(() => undefined)
      reading = false
    }
  }
  if (!ended) throw new AiError('unavailable', 'truncated_stream')
  return { text, usage }
}

async function abortStream(reader: ReadableStreamDefaultReader<Uint8Array>, error: AiError): Promise<AiError> {
  await reader.cancel().catch(() => undefined)
  return error
}

export async function chatText(
  deps: AiClientDeps,
  messages: readonly AiMessage[],
  opts: AiCallOptions,
  onDelta: (delta: string) => void,
): Promise<AiCallResult<string>> {
  const now = deps.now ?? Date.now
  const started = now()
  const response = await postChat(deps, requestBody(deps.config, messages, opts, true), opts.signal)
  if (!response.body) throw new AiError('unavailable', 'empty_body')
  try {
    const { text, usage } = await readStream(response.body, maxChars(opts), onDelta)
    if (!text.trim()) throw new AiError('invalid_output', 'empty_text')
    return { value: text, usage, latencyMs: now() - started }
  } catch (error) {
    throw toAiError(error)
  }
}

async function readBody(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch (error) {
    throw toAiError(error)
  }
}

function parseCompletion(raw: string): { content: string; usage: AiUsage } {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return { content: '', usage: EMPTY_USAGE }
  }
  const parsed = completionSchema.safeParse(json)
  if (!parsed.success) return { content: '', usage: EMPTY_USAGE }
  return {
    content: parsed.data.choices?.[0]?.message.content ?? '',
    usage: readUsage(parsed.data.usage),
  }
}

async function completeOnce(deps: AiClientDeps, messages: readonly AiMessage[], opts: AiCallOptions): Promise<{ content: string; usage: AiUsage }> {
  const response = await postChat(deps, requestBody(deps.config, messages, opts, false), opts.signal)
  const result = parseCompletion(await readBody(response))
  if (result.content.length > maxChars(opts)) throw new AiError('invalid_output', 'too_long')
  return result
}

export async function chatJson<T>(
  deps: AiClientDeps,
  messages: readonly AiMessage[],
  schema: z.ZodType<T>,
  opts: AiCallOptions,
): Promise<AiCallResult<T>> {
  const now = deps.now ?? Date.now
  const started = now()
  const first = await completeOnce(deps, messages, opts)
  const firstValue = schema.safeParse(parseJsonContent(first.content))
  if (firstValue.success) return { value: firstValue.data, usage: first.usage, latencyMs: now() - started }

  const retry: readonly AiMessage[] = [
    ...messages,
    { role: 'assistant', content: first.content.slice(0, 4000) },
    { role: 'user', content: FIX_INSTRUCTION },
  ]
  const second = await completeOnce(deps, retry, opts)
  const secondValue = schema.safeParse(parseJsonContent(second.content))
  if (!secondValue.success) throw new AiError('invalid_output', 'schema')
  return { value: secondValue.data, usage: addUsage(first.usage, second.usage), latencyMs: now() - started }
}
