import { z } from 'zod'

const emptyToUndefined = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

const isPlainHttpUrl = (value: string): boolean => {
  const url = URL.parse(value)
  return url !== null && (url.protocol === 'http:' || url.protocol === 'https:') && url.username === '' && url.password === ''
}

const aiEnvSchema = z.object({
  AI_BASE_URL: z.preprocess(emptyToUndefined, z.url().refine(isPlainHttpUrl).default('http://ollama:11434/v1')),
  AI_MODEL: z.preprocess(emptyToUndefined, z.string().min(1).max(100).default('gemma3:4b')),
  AI_TIMEOUT_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1000).max(120000).default(45000)),
  AI_KEEP_ALIVE: z.preprocess(emptyToUndefined, z.string().regex(/^\d+[smh]$/).default('30m')),
  AI_LIMITS_ENFORCED: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).default('true')),
})

export interface AiConfig {
  readonly baseUrl: string
  readonly model: string
  readonly timeoutMs: number
  readonly keepAlive: string
  /** Debe coincidir con el GUC ai.limits_enforced de la base; la base es la que decide. */
  readonly limitsEnforced: boolean
}

export type AiEnv = Readonly<Record<string, string | undefined>>

export function loadAiConfig(env: AiEnv = process.env): AiConfig {
  const parsed = aiEnvSchema.safeParse(env)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Configuración de IA inválida: ${fields}`)
  }
  const values = parsed.data
  return {
    baseUrl: values.AI_BASE_URL.replace(/\/+$/, ''),
    model: values.AI_MODEL,
    timeoutMs: values.AI_TIMEOUT_MS,
    keepAlive: values.AI_KEEP_ALIVE,
    limitsEnforced: values.AI_LIMITS_ENFORCED === 'true',
  }
}
