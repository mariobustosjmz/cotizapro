'use client'

import { useCallback, useState } from 'react'
import { z } from 'zod'
import { AI_UNAVAILABLE_MESSAGE, AiClientError, aiErrorFromResponse, isAbortError } from '@/lib/ai/client-stream'
import { announceAiUsage } from '@/lib/ai/status-cache'
import { useAbortOnUnmount } from './use-abort-on-unmount'
import { useElapsedSeconds } from './use-elapsed-seconds'

export interface AiJsonState {
  readonly busy: boolean
  readonly error: string | null
  readonly elapsed: number
  /** Cancela la petición en curso (el servidor la cierra como failed y no cobra) y borra el error anterior. */
  readonly abort: () => void
  readonly run: <T>(endpoint: string, body: unknown, schema: z.ZodType<T>) => Promise<T | null>
}

export function useAiJson(): AiJsonState {
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const elapsed = useElapsedSeconds(startedAt)
  const { guard, isMounted } = useAbortOnUnmount()

  const run = useCallback(
    async <T,>(endpoint: string, body: unknown, schema: z.ZodType<T>): Promise<T | null> => {
      const handle = guard.start()
      if (!handle) return null
      const { signal } = handle
      setStartedAt(Date.now())
      setError(null)
      try {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
        if (!response.ok) throw await aiErrorFromResponse(response)
        const parsed = z.object({ data: schema }).safeParse(await response.json())
        if (!parsed.success) throw new AiClientError('invalid_output', 'No se pudo leer la respuesta. Intenta de nuevo.')
        return parsed.data.data
      } catch (e) {
        if (isAbortError(e) || !isMounted()) return null
        setError(e instanceof AiClientError ? e.message : AI_UNAVAILABLE_MESSAGE)
        return null
      } finally {
        if (guard.finish(handle) && isMounted()) setStartedAt(null)
        announceAiUsage()
      }
    },
    [guard, isMounted],
  )

  const abort = useCallback((): void => {
    guard.abortAll()
    setStartedAt(null)
    setError(null)
  }, [guard])

  return { busy: startedAt !== null, error, elapsed, abort, run }
}
