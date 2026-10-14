'use client'

import { useCallback, useEffect, useState } from 'react'

export interface ActiveShare {
  readonly expires_at: string
  readonly first_viewed_at: string | null
  readonly created_at: string
}

export type ShareLinkAction = 'idle' | 'loading' | 'generating' | 'revoking'
type ShareRequestKind = Exclude<ShareLinkAction, 'idle'>

export interface QuoteShareLinkState {
  readonly active: ActiveShare | null
  readonly url: string | null
  readonly action: ShareLinkAction
  readonly error: string
  readonly copied: boolean
  generate(): Promise<void>
  revoke(): Promise<void>
  copy(): Promise<void>
}

const COPIED_RESET_MS = 2000

const FALLBACK_MESSAGES: Readonly<Record<ShareRequestKind, string>> = {
  loading: 'No se pudo consultar la liga',
  generating: 'No se pudo generar la liga',
  revoking: 'No se pudo revocar la liga',
}

/** Mensaje de error del servidor (ya en español); solo se usa cuando la respuesta trae un `error` de texto. */
class ShareServerError extends Error {}

export function shareErrorMessage(kind: ShareRequestKind, error: unknown): string {
  if (error instanceof ShareServerError && error.message.trim()) return error.message
  return FALLBACK_MESSAGES[kind]
}

function serverError(body: { error?: unknown }): Error {
  return typeof body.error === 'string' && body.error.trim() ? new ShareServerError(body.error) : new Error('respuesta inválida')
}

async function fetchActiveShare(quoteId: string): Promise<ActiveShare | null> {
  const res = await fetch(`/api/quotes/${quoteId}/share`)
  const body: { data?: ActiveShare | null; error?: unknown } = await res.json().catch(() => ({}))
  if (!res.ok) throw serverError(body)
  return body.data ?? null
}

/** El token solo existe al crearlo: después solo se sabe que hay una liga activa y cuándo vence. */
export function useQuoteShareLink(
  quoteId: string,
  freshUrl: string | null,
  onLinkChanged?: (url: string | null) => void,
): QuoteShareLinkState {
  const [active, setActive] = useState<ActiveShare | null>(null)
  const [url, setUrl] = useState<string | null>(freshUrl)
  const [action, setAction] = useState<ShareLinkAction>('loading')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const run = useCallback(async (kind: ShareRequestKind, task: () => Promise<void>) => {
    setAction(kind)
    setError('')
    try {
      await task()
    } catch (e) {
      setError(shareErrorMessage(kind, e))
    } finally {
      setAction('idle')
    }
  }, [])

  useEffect(() => {
    void run('loading', async () => setActive(await fetchActiveShare(quoteId)))
  }, [quoteId, run])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS)
    return () => clearTimeout(timer)
  }, [copied])

  const generate = useCallback(() => {
    if (active && !window.confirm('Se creará una liga nueva y la anterior dejará de funcionar. ¿Continuar?')) {
      return Promise.resolve()
    }
    return run('generating', async () => {
      const res = await fetch(`/api/quotes/${quoteId}/share`, { method: 'POST' })
      const body: { data?: { url?: unknown }; error?: unknown } = await res.json().catch(() => ({}))
      if (!res.ok) throw serverError(body)
      if (typeof body.data?.url !== 'string') throw new Error('respuesta inválida')
      setUrl(body.data.url)
      setCopied(false)
      onLinkChanged?.(body.data.url)
      setActive(await fetchActiveShare(quoteId))
    })
  }, [active, quoteId, run, onLinkChanged])

  const revoke = useCallback(() => {
    if (!window.confirm('¿Revocar la liga? Tu cliente ya no podrá abrirla.')) return Promise.resolve()
    return run('revoking', async () => {
      const res = await fetch(`/api/quotes/${quoteId}/share`, { method: 'DELETE' })
      const body: { error?: unknown } = await res.json().catch(() => ({}))
      if (!res.ok) throw serverError(body)
      setUrl(null)
      setActive(null)
      onLinkChanged?.(null)
    })
  }, [quoteId, run, onLinkChanged])

  const copy = useCallback(async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setError('No se pudo copiar. Selecciona la liga y cópiala a mano.')
    }
  }, [url])

  return { active, url, action, error, copied, generate, revoke, copy }
}
