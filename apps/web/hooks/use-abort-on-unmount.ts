'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createRunGuard, type RunGuard } from '@/lib/ai/run-guard'

export interface AbortScope {
  readonly guard: RunGuard
  readonly isMounted: () => boolean
}

/** Expone el guard de ejecución y cancela la petición en curso al desmontar. */
export function useAbortOnUnmount(): AbortScope {
  const [guard] = useState<RunGuard>(createRunGuard)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      guard.abortAll()
    }
  }, [guard])

  const isMounted = useCallback((): boolean => mountedRef.current, [])
  return { guard, isMounted }
}
