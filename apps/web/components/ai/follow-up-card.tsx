'use client'

import { useState } from 'react'
import { Copy, MessageCircle } from 'lucide-react'
import { useAiText } from '@/hooks/use-ai-text'
import { AI_FEATURES } from '@/lib/ai/features'
import { whatsappLink } from '@/lib/whatsapp/link'
import { AiButton } from './ai-button'

interface FollowUpCardProps {
  readonly quoteId: string
  readonly clientName: string | null
  readonly whatsappPhone: string | null
  readonly days: number
}

const MAX_MESSAGE_CHARS = AI_FEATURES.follow_up.maxOutputChars
const ACTION = 'inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium'

export function FollowUpCard({ quoteId, clientName, whatsappPhone, days }: FollowUpCardProps) {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const { busy, error, run } = useAiText()
  const message = text.trim()
  const link = message ? whatsappLink(whatsappPhone, message) : null

  async function generate(): Promise<void> {
    const previous = text
    setCopied(false)
    setCopyError(null)
    const result = await run('/api/ai/follow-up', { quoteId }, setText)
    if (result === null) setText(previous)
  }

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setCopyError(null)
    } catch {
      setCopied(false)
      setCopyError('No se pudo copiar. Selecciona el texto y cópialo manualmente.')
    }
  }

  return (
    <section
      id="seguimiento"
      className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-2"
      data-testid="follow-up-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Seguimiento</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {clientName ?? 'El cliente'} lleva {days} días sin responder.
          </p>
        </div>
        <AiButton feature="follow_up" label="Escribir seguimiento" busy={busy} onClick={generate} testId="follow-up-generate" />
      </div>
      <label htmlFor="follow-up-text" className="sr-only">Mensaje de seguimiento</label>
      <textarea
        id="follow-up-text"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setCopied(false)
        }}
        maxLength={MAX_MESSAGE_CHARS}
        rows={3}
        placeholder="Aquí aparece el mensaje; puedes editarlo antes de enviarlo."
        data-testid="follow-up-text"
        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400" role="alert" data-testid="follow-up-error">{error}</p>}
      {copyError && <p className="text-xs text-red-600 dark:text-red-400" role="alert" data-testid="follow-up-copy-error">{copyError}</p>}
      {message && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={copy} data-testid="follow-up-copy" className={`${ACTION} border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800`}>
            <Copy className="w-3.5 h-3.5" aria-hidden />
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" data-testid="follow-up-whatsapp" className={`${ACTION} bg-green-600 text-white hover:bg-green-700`}>
              <MessageCircle className="w-3.5 h-3.5" aria-hidden />
              Abrir en WhatsApp
            </a>
          )}
        </div>
      )}
      {message && !whatsappPhone && <p className="text-xs text-gray-500 dark:text-gray-400">El cliente no tiene WhatsApp registrado; copia el mensaje.</p>}
    </section>
  )
}
