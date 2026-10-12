'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { convertQuoteRequest, fetchQuoteRequests, patchQuoteRequestStatus, type PatchableStatus } from './api'
import type { QuoteRequest, QuoteRequestFilter } from './types'

interface UseQuoteRequestsResult {
  readonly requests: readonly QuoteRequest[]
  readonly loading: boolean
  readonly error: string
  readonly pendingId: string | null
  readonly reload: () => Promise<void>
  readonly setStatus: (id: string, status: PatchableStatus) => Promise<boolean>
  readonly convert: (id: string) => Promise<string | null>
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

function applyStatus(
  list: readonly QuoteRequest[],
  id: string,
  status: PatchableStatus,
  filter: QuoteRequestFilter,
): readonly QuoteRequest[] {
  if (filter !== 'all' && filter !== status) return list.filter((r) => r.id !== id)
  return list.map((r) => (r.id === id ? { ...r, status } : r))
}

export function useQuoteRequests(filter: QuoteRequestFilter, onError: (message: string) => void): UseQuoteRequestsResult {
  const [requests, setRequests] = useState<readonly QuoteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)

  const latestLoadRef = useRef(0)

  const reload = useCallback(async () => {
    const loadId = latestLoadRef.current + 1
    latestLoadRef.current = loadId
    setLoading(true)
    setError('')
    try {
      const data = await fetchQuoteRequests(filter)
      if (latestLoadRef.current === loadId) setRequests(data)
    } catch (err) {
      if (latestLoadRef.current === loadId) setError(toMessage(err, 'No se pudieron cargar las solicitudes'))
    } finally {
      if (latestLoadRef.current === loadId) setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void reload()
  }, [reload])

  const setStatus = useCallback(async (id: string, status: PatchableStatus): Promise<boolean> => {
    setPendingId(id)
    try {
      await patchQuoteRequestStatus(id, status)
      setRequests((prev) => applyStatus(prev, id, status, filter))
      return true
    } catch (err) {
      onError(toMessage(err, 'No se pudo actualizar la solicitud'))
      return false
    } finally {
      setPendingId(null)
    }
  }, [filter, onError])

  const convert = useCallback(async (id: string): Promise<string | null> => {
    setPendingId(id)
    try {
      return await convertQuoteRequest(id)
    } catch (err) {
      onError(toMessage(err, 'No se pudo convertir la solicitud'))
      setPendingId(null)
      return null
    }
  }, [onError])

  return { requests, loading, error, pendingId, reload, setStatus, convert }
}
