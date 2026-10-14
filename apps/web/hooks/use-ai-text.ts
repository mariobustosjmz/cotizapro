'use client'

import { useCallback, useState } from 'react'
import { AI_UNAVAILABLE_MESSAGE, AiClientError, aiErrorFromResponse, isAbortError, readAiTextStream } from '@/lib/ai/client-stream'
import { announceAiUsage } from '@/lib/ai/status-cache'
import { useAbortOnUnmount } from './use-abort-on-unmount'

export interface AiTextState {
  readonly busy: boolean
  readonly error: string | null
  readonly abort: () => void
  readonly run: (endpoint: string, body: unknown, onText: (text: string) => void) => Promise<string | null>
}

export function useAiText(): AiTextState {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { guard, isMounted } = useAbortOnUnmount()

  const run = useCallback(
    async (endpoint: string, body: unknown, onText: (text: string) => void): Promise<string | null> => {
      const handle = guard.start()
      if (!handle) return null
      const { signal } = handle
      setBusy(true)
      setError(null)
      try {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })
        if (!response.ok) throw await aiErrorFromResponse(response)
        return await readAiTextStream(response, onText, signal)
      } catch (e) {
        if (isAbortError(e) || !isMounted()) return null
        setError(e instanceof AiClientError ? e.message : AI_UNAVAILABLE_MESSAGE)
        return null
      } finally {
        if (guard.finish(handle) && isMounted()) setBusy(false)
        announceAiUsage()
      }
    },
    [guard, isMounted],
  )

  const abort = useCallback((): void => {
    guard.abortAll()
    setBusy(false)
  }, [guard])

  return { busy, error, abort, run }
}
