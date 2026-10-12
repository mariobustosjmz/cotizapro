'use client'

import { useState } from 'react'
import { CheckCircle2, Star } from 'lucide-react'

interface ReviewFormProps {
  readonly token: string
  readonly business: string
  readonly profileUrl: string | null
}

const LABELS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'] as const

export function ReviewForm({ token, business, profileUrl }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError('Elige de 1 a 5 estrellas.')
      return
    }
    setStatus('sending')
    setError('')
    try {
      const res = await fetch('/api/public/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, rating, comment: comment || undefined }),
      })
      const body: { error?: string } = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error ?? 'No pudimos guardar tu reseña.')
        setStatus('idle')
        return
      }
      setStatus('sent')
    } catch {
      setError('Sin conexión. Intenta de nuevo.')
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <div className="text-center" data-testid="review-sent">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" aria-hidden />
        <p className="mt-3 text-lg font-semibold text-gray-900">¡Gracias por tu reseña!</p>
        <p className="text-sm text-gray-500">Ayudas a que más personas encuentren a {business}.</p>
        {profileUrl && (
          <a href={profileUrl} className="mt-4 inline-block text-sm font-semibold text-orange-600 hover:underline">
            Ver su página
          </a>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">Calificación *</legend>
        <div className="flex justify-center gap-1" role="radiogroup">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={n === 1 ? "1 estrella" : `${n} estrellas`}
              onClick={() => setRating(n)}
              className="p-1 cursor-pointer"
            >
              <Star className={`w-10 h-10 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} aria-hidden />
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-gray-500 h-5">{LABELS[rating]}</p>
      </fieldset>
      <div>
        <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-1">Comentario</label>
        <textarea
          id="review-comment"
          rows={4}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="¿Qué tal fue el trabajo, la puntualidad y el trato?"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={status === 'sending'} className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold py-3">
        {status === 'sending' ? 'Enviando...' : 'Enviar reseña'}
      </button>
    </form>
  )
}
