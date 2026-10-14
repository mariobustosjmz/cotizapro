import { z } from 'zod'

export interface AiStatusView {
  readonly available: boolean
  readonly remaining: number
  readonly enforced: boolean
  readonly resetsOn: string
  readonly percent: number
}

export const AI_USAGE_EVENT = 'ai-usage-changed'
export const UNAVAILABLE_STATUS: AiStatusView = { available: false, remaining: 0, enforced: true, resetsOn: '', percent: 0 }

const responseSchema = z.object({
  data: z.object({
    available: z.boolean(),
    summary: z.object({ remaining: z.number(), enforced: z.boolean(), resets_on: z.string(), percent: z.number() }),
  }),
})

export const AI_STATUS_TTL_MS = 30_000

interface CacheEntry {
  readonly promise: Promise<AiStatusView>
  readonly at: number
}

let shared: CacheEntry | null = null

export function toStatusView(body: unknown): AiStatusView {
  const parsed = responseSchema.safeParse(body)
  if (!parsed.success) return UNAVAILABLE_STATUS
  const { available, summary } = parsed.data.data
  return { available, remaining: summary.remaining, enforced: summary.enforced, resetsOn: summary.resets_on, percent: summary.percent }
}

/** Todos los botones comparten una petición; la entrada vence a los 30 s y nunca se guarda available:false. */
export function fetchAiStatus(fetchImpl: typeof fetch = fetch, now: () => number = Date.now): Promise<AiStatusView> {
  if (shared && now() - shared.at < AI_STATUS_TTL_MS) return shared.promise
  const drop = (): void => {
    if (shared?.promise === promise) shared = null
  }
  const promise: Promise<AiStatusView> = fetchImpl('/api/ai/status', { cache: 'no-store' })
    .then(async (res) => {
      if (!res.ok) {
        drop()
        return UNAVAILABLE_STATUS
      }
      const view = toStatusView(await res.json())
      if (!view.available) drop()
      return view
    })
    .catch(() => {
      drop()
      return UNAVAILABLE_STATUS
    })
  shared = { promise, at: now() }
  return promise
}

export function invalidateAiStatus(): void {
  shared = null
}

export function announceAiUsage(): void {
  invalidateAiStatus()
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AI_USAGE_EVENT))
}
