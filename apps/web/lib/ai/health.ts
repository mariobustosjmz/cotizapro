import { z } from 'zod'
import type { AiConfig } from './config'

export interface AiHealthDeps {
  readonly config: AiConfig
  readonly fetchImpl?: typeof fetch
  readonly now?: () => number
  readonly ttlMs?: number
}

export interface AiHealth {
  isAvailable(): Promise<boolean>
}

const PROBE_TIMEOUT_MS = 3000
const modelsSchema = z.object({ data: z.array(z.object({ id: z.string() })) })

export function createAiHealth(deps: AiHealthDeps): AiHealth {
  const now = deps.now ?? Date.now
  const ttl = deps.ttlMs ?? 60_000
  let cached: { readonly at: number; readonly ok: boolean } | null = null
  let inFlight: Promise<boolean> | null = null

  async function probe(): Promise<boolean> {
    try {
      const res = await (deps.fetchImpl ?? fetch)(`${deps.config.baseUrl}/models`, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) })
      if (!res.ok) {
        await res.body?.cancel().catch(() => undefined)
        return false
      }
      const parsed = modelsSchema.safeParse(await res.json())
      return parsed.success && parsed.data.data.some((m) => m.id === deps.config.model)
    } catch {
      return false
    }
  }

  async function refresh(): Promise<boolean> {
    const ok = await probe()
    cached = { at: now(), ok }
    return ok
  }

  return {
    async isAvailable(): Promise<boolean> {
      if (cached && now() - cached.at < ttl) return cached.ok
      inFlight ??= refresh().finally(() => {
        inFlight = null
      })
      return inFlight
    },
  }
}
