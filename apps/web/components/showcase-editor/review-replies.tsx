'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { AiRewriteButton } from '@/components/ai/ai-rewrite-button'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import type { ReviewForReply } from '@/lib/showcase/review-replies'
import { REVIEW_REPLY_MAX } from '@/lib/validations/showcase'


interface ReplyResponse {
  readonly data?: { readonly owner_reply: string | null }
  readonly error?: string
  readonly fieldErrors?: { readonly owner_reply?: string }
}

function Stars({ rating }: { readonly rating: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${rating} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-3.5 w-3.5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} aria-hidden />
      ))}
    </span>
  )
}

function ReviewReplyItem({ review }: { readonly review: ReviewForReply }) {
  const { toast } = useToast()
  const [saved, setSaved] = useState(review.ownerReply ?? '')
  const [reply, setReply] = useState(saved)
  const [saving, setSaving] = useState(false)
  const [fieldError, setFieldError] = useState('')

  async function save(): Promise<void> {
    setSaving(true)
    setFieldError('')
    try {
      const res = await fetch(`/api/showcase/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_reply: reply }),
      })
      const body: ReplyResponse = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFieldError(body.fieldErrors?.owner_reply ?? '')
        toast({ message: body.error ?? 'No se pudo guardar la respuesta', variant: 'error' })
        return
      }
      const next = body.data?.owner_reply ?? ''
      setSaved(next)
      setReply(next)
      toast({ message: next ? 'Respuesta guardada' : 'Respuesta eliminada', variant: 'success' })
    } catch {
      toast({ message: 'No se pudo guardar la respuesta', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="space-y-2 border-t border-gray-100 pt-3 first:border-t-0 first:pt-0 dark:border-gray-800">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
          {review.clientName ?? 'Cliente'}
          {!review.isVisible && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300" data-testid={`review-hidden-${review.id}`}>Oculta</span>}
        </span>
        <Stars rating={review.rating} />
      </div>
      {review.comment && <p className="text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>}
      <label htmlFor={`review-reply-${review.id}`} className="block text-xs font-medium text-gray-500 dark:text-gray-400">Tu respuesta</label>
      <textarea
        id={`review-reply-${review.id}`}
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        maxLength={REVIEW_REPLY_MAX}
        rows={2}
        data-testid={`review-reply-${review.id}`}
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white ${fieldError ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-700'}`}
      />
      {fieldError && <p className="text-xs text-red-600" role="alert">{fieldError}</p>}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <AiRewriteButton text={reply} context="review_reply" onChange={setReply} testId={`ai-rewrite-review-${review.id}`} />
        <Button type="button" size="sm" onClick={save} disabled={saving || reply.trim() === saved} data-testid={`review-reply-save-${review.id}`}>
          {saving ? 'Guardando...' : 'Guardar respuesta'}
        </Button>
      </div>
    </li>
  )
}

export function ReviewReplies({ reviews, failed }: { readonly reviews: readonly ReviewForReply[]; readonly failed: boolean }) {
  if (failed) return <p className="text-sm text-red-600" role="alert" data-testid="review-replies-error">No pudimos cargar tus reseñas. Intenta de nuevo.</p>
  if (reviews.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Aún no tienes reseñas. Pídelas desde una cotización cobrada.</p>
  }
  return (
    <ul className="space-y-3" data-testid="review-replies">
      {reviews.map((review) => <ReviewReplyItem key={review.id} review={review} />)}
    </ul>
  )
}
