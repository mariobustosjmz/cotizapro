'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RespondPublicQuoteInput } from '@/lib/validations/public-quote'

export type QuoteResponseStatus = 'idle' | 'sending' | 'done'

export interface QuoteResponseState {
  readonly status: QuoteResponseStatus
  readonly error: string
  readonly respond: (input: RespondPublicQuoteInput) => Promise<void>
}

/** Envía la respuesta del cliente y vuelve a pintar la página de servidor con el estado nuevo. */
export function useQuoteResponse(token: string): QuoteResponseState {
  const router = useRouter()
  const [status, setStatus] = useState<QuoteResponseStatus>('idle')
  const [error, setError] = useState('')

  const respond = useCallback(async (input: RespondPublicQuoteInput) => {
    setStatus('sending')
    setError('')
    try {
      const res = await fetch(`/api/public/quotes/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const body: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'No pudimos registrar tu respuesta. Intenta de nuevo.')
        setStatus('idle')
        return
      }
      setStatus('done')
      router.refresh()
    } catch {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.')
      setStatus('idle')
    }
  }, [router, token])

  return { status, error, respond }
}
