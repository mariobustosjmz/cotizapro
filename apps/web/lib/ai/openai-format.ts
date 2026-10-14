import { z } from 'zod'

const tokenSchema = z.number().int().nonnegative()

export interface RawUsage {
  readonly promptTokens: number | null
  readonly completionTokens: number | null
}

/** Lee el uso campo por campo: un valor inválido se vuelve null y nunca descarta el contenido. */
export function readUsage(value: unknown): RawUsage {
  const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  const read = (key: string): number | null => {
    const parsed = tokenSchema.safeParse(record[key])
    return parsed.success ? parsed.data : null
  }
  return { promptTokens: read('prompt_tokens'), completionTokens: read('completion_tokens') }
}

const chunkSchema = z.object({
  choices: z
    .array(
      z.object({
        delta: z.object({ content: z.string().nullable().optional() }).optional(),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .optional(),
  usage: z.unknown().optional(),
})

export interface StreamPiece {
  readonly delta: string
  readonly promptTokens: number | null
  readonly completionTokens: number | null
}

export interface ParsedSse {
  readonly pieces: readonly StreamPiece[]
  readonly rest: string
  readonly done: boolean
  /** Algún fragmento trae finish_reason: el modelo terminó aunque falte [DONE]. */
  readonly finished: boolean
  /** Algún fragmento trae una llave `error`. */
  readonly failed: boolean
}

interface ParsedPayload {
  readonly piece: StreamPiece | null
  readonly finished: boolean
  readonly failed: boolean
}

const IGNORED: ParsedPayload = { piece: null, finished: false, failed: false }

function parsePayload(payload: string): ParsedPayload {
  let json: unknown
  try {
    json = JSON.parse(payload)
  } catch {
    return IGNORED
  }
  if (typeof json === 'object' && json !== null && 'error' in json && (json as { error: unknown }).error != null) {
    return { piece: null, finished: false, failed: true }
  }
  const parsed = chunkSchema.safeParse(json)
  if (!parsed.success) return IGNORED
  const choice = parsed.data.choices?.[0]
  return {
    piece: {
      delta: choice?.delta?.content ?? '',
      ...readUsage(parsed.data.usage),
    },
    finished: Boolean(choice?.finish_reason),
    failed: false,
  }
}

/** Separa las líneas `data:` completas del stream de OpenAI; la última línea incompleta queda en `rest`. */
export function parseOpenAiSse(buffer: string): ParsedSse {
  const lines = buffer.split('\n')
  const rest = lines[lines.length - 1] ?? ''
  const payloads = lines
    .slice(0, -1)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
  const parsed = payloads.filter((p) => p && p !== '[DONE]').map(parsePayload)
  return {
    pieces: parsed.flatMap((p) => (p.piece ? [p.piece] : [])),
    rest,
    done: payloads.includes('[DONE]'),
    finished: parsed.some((p) => p.finished),
    failed: parsed.some((p) => p.failed),
  }
}

export function parseJsonContent(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return undefined
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return undefined
  }
}
