import { z } from 'zod'

export type AiStreamEvent =
  | { readonly type: 'delta'; readonly delta: string }
  | { readonly type: 'done'; readonly text: string }
  | { readonly type: 'error'; readonly code: string; readonly message: string }

export class AiClientError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AiClientError'
    this.code = code
  }
}

export const AI_UNAVAILABLE_MESSAGE = 'La IA no está disponible por ahora'
const deltaSchema = z.object({ delta: z.string() })
const doneSchema = z.object({ done: z.literal(true), text: z.string() })
const errorSchema = z.object({ code: z.string(), error: z.string() })

function toEvent(payload: unknown, isError: boolean): readonly AiStreamEvent[] {
  if (isError) {
    const error = errorSchema.safeParse(payload)
    return error.success ? [{ type: 'error', code: error.data.code, message: error.data.error }] : []
  }
  const done = doneSchema.safeParse(payload)
  if (done.success) return [{ type: 'done', text: done.data.text }]
  const delta = deltaSchema.safeParse(payload)
  return delta.success ? [{ type: 'delta', delta: delta.data.delta }] : []
}

function parseBlock(block: string): readonly AiStreamEvent[] {
  const lines = block.split('\n')
  const isError = lines.some((line) => line.trim() === 'event: error')
  const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('')
  if (!data) return []
  try {
    return toEvent(JSON.parse(data), isError)
  } catch {
    return []
  }
}

export function parseAiSse(buffer: string): { readonly events: readonly AiStreamEvent[]; readonly rest: string } {
  // Un \r final puede ser la mitad de un \r\n partido entre fragmentos: se conserva sin normalizar.
  const pendingCr = buffer.endsWith('\r') ? '\r' : ''
  const normalized = (pendingCr ? buffer.slice(0, -1) : buffer).replace(/\r\n?/g, '\n')
  const blocks = normalized.split('\n\n')
  return { events: blocks.slice(0, -1).flatMap(parseBlock), rest: (blocks[blocks.length - 1] ?? '') + pendingCr }
}

function abortError(): DOMException {
  return new DOMException('Cancelado', 'AbortError')
}

/** Lee el SSE de la IA. `stream: true` en el decodificador conserva los bytes UTF-8 partidos entre fragmentos. */
export async function readAiTextStream(response: Response, onText: (text: string) => void, signal?: AbortSignal): Promise<string> {
  if (!response.body) throw new AiClientError('unavailable', AI_UNAVAILABLE_MESSAGE)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  try {
    for (;;) {
      if (signal?.aborted) throw abortError()
      const { value, done } = await reader.read()
      if (signal?.aborted) throw abortError()
      if (done) break
      const parsed = parseAiSse(buffer + decoder.decode(value, { stream: true }))
      buffer = parsed.rest
      for (const event of parsed.events) {
        if (event.type === 'error') throw new AiClientError(event.code, event.message)
        if (event.type === 'done') {
          onText(event.text)
          return event.text
        }
        text += event.delta
        onText(text)
      }
    }
  } finally {
    reader.cancel().catch(() => undefined)
  }
  throw new AiClientError('unavailable', AI_UNAVAILABLE_MESSAGE)
}

const STATUS_FALLBACK: Readonly<Record<number, { readonly code: string; readonly message: string }>> = {
  400: { code: 'invalid_request', message: 'Revisa los datos e intenta de nuevo' },
  402: { code: 'quota_exceeded', message: 'Usaste tus créditos de IA de este mes' },
  429: { code: 'daily_cap', message: 'Llegaste al límite diario de IA para tu usuario' },
}

const looseErrorSchema = z.object({ error: z.string(), code: z.string().optional() })

export async function aiErrorFromResponse(response: Response): Promise<AiClientError> {
  const body: unknown = await response.json().catch(() => null)
  const parsed = looseErrorSchema.safeParse(body)
  const fallback = STATUS_FALLBACK[response.status]
  if (parsed.success) return new AiClientError(parsed.data.code ?? fallback?.code ?? 'unavailable', parsed.data.error)
  return new AiClientError(fallback?.code ?? 'unavailable', fallback?.message ?? AI_UNAVAILABLE_MESSAGE)
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
