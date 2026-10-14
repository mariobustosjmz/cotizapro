'use client'

import { useEffect, useRef, useState } from 'react'
import { AI_USAGE_EVENT, fetchAiStatus, type AiStatusView } from '@/lib/ai/status-cache'

export function useAiStatus(): AiStatusView | null {
  const [status, setStatus] = useState<AiStatusView | null>(null)
  const sequence = useRef(0)

  useEffect(() => {
    let active = true
    const load = (): void => {
      const ticket = ++sequence.current
      void fetchAiStatus().then((value) => {
        if (active && ticket === sequence.current) setStatus(value)
      })
    }
    const onVisible = (): void => {
      if (document.visibilityState === 'visible') load()
    }
    load()
    window.addEventListener(AI_USAGE_EVENT, load)
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      window.removeEventListener(AI_USAGE_EVENT, load)
      window.removeEventListener('focus', load)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return status
}
