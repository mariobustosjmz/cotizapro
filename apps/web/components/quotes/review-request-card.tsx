'use client'

import { useState } from 'react'
import { Copy, Mail, MessageCircle, Star } from 'lucide-react'

interface ReviewLink {
  readonly url: string
  readonly message: string
  readonly whatsapp_url: string | null
}

export function ReviewRequestCard({ quoteId, clientEmail }: { readonly quoteId: string; readonly clientEmail: string | null }) {
  const [link, setLink] = useState<ReviewLink | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function request() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/quotes/${quoteId}/review-request`, { method: 'POST' })
      const body: { data?: ReviewLink; error?: string } = await res.json().catch(() => ({}))
      if (!res.ok || !body.data) throw new Error(body.error ?? 'No se pudo generar la liga')
      setLink(body.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la liga')
    } finally {
      setLoading(false)
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const mailto = link && clientEmail ? `mailto:${clientEmail}?subject=${encodeURIComponent('¿Cómo te fue con nuestro trabajo?')}&body=${encodeURIComponent(link.message)}` : null
  const btn = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-emerald-200 dark:border-emerald-900/50 p-4 space-y-3" data-testid="review-request-card">
      <div className="flex items-start gap-2">
        <Star className="w-4 h-4 text-amber-500 mt-0.5" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pide una reseña verificada</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Tu cliente califica con un clic. La reseña aparece en tu página con la marca de verificada.</p>
        </div>
      </div>
      {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
      {!link ? (
        <button type="button" onClick={request} disabled={loading} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 py-2 text-xs font-semibold text-white" data-testid="review-request-button">
          {loading ? 'Generando...' : 'Pedir reseña'}
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {link.whatsapp_url && (
            <a href={link.whatsapp_url} target="_blank" rel="noopener noreferrer" className={btn}>
              <MessageCircle className="w-3.5 h-3.5" aria-hidden /> Enviar por WhatsApp
            </a>
          )}
          {mailto && (
            <a href={mailto} className={btn}>
              <Mail className="w-3.5 h-3.5" aria-hidden /> Enviar por correo
            </a>
          )}
          <button type="button" onClick={() => copy(link.url)} className={btn} data-testid="review-link-copy">
            <Copy className="w-3.5 h-3.5" aria-hidden /> {copied ? 'Liga copiada' : 'Copiar liga'}
          </button>
        </div>
      )}
    </section>
  )
}
