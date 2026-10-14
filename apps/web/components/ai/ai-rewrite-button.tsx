'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import { useAiText } from '@/hooks/use-ai-text'
import { REWRITE_MODE_LABELS } from '@/lib/ai/rewrite-labels'
import { REWRITE_OUTPUT_LIMITS, exceedsRewriteLimit } from '@/lib/ai/rewrite-limits'
import { REWRITE_MODES, type RewriteContext, type RewriteMode } from '@/lib/validations/ai'
import { AiButton } from './ai-button'
import { IDLE_SUGGESTION, suggestionFor, suggestionReducer } from './describe-suggestion'

interface AiRewriteButtonProps {
  readonly text: string
  readonly context: RewriteContext
  readonly onChange: (text: string) => void
  readonly testId: string
  /** Largo máximo que admite el campo de destino; por omisión el del contexto. */
  readonly maxChars?: number
}

const MAX_CHARS = 2000
const ACTION_BASE = 'cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium'

export function AiRewriteButton({ text, context, onChange, testId, maxChars = REWRITE_OUTPUT_LIMITS[context] }: AiRewriteButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { busy, error, abort, run } = useAiText()
  const [state, dispatch] = useReducer(suggestionReducer, IDLE_SUGGESTION)
  const requestRef = useRef(0)
  const suggestion = suggestionFor(state, text)
  const stale = state.phase !== 'idle' && suggestion.phase === 'idle'
  const tooLong = text.length > MAX_CHARS

  useEffect(() => {
    if (!stale) return
    abort()
    dispatch({ type: 'discard' })
  }, [stale, abort])

  async function handlePick(mode: RewriteMode): Promise<void> {
    setMenuOpen(false)
    const requestId = ++requestRef.current
    dispatch({ type: 'start', requestId, source: text })
    const result = await run('/api/ai/rewrite', { text, mode, context }, (partial) => dispatch({ type: 'text', requestId, text: partial }))
    dispatch({ type: 'finish', requestId, text: result })
  }

  function handleAccept(): void {
    onChange(suggestion.text)
    dispatch({ type: 'discard' })
  }

  function handleDiscard(): void {
    if (suggestion.phase === 'streaming') abort()
    dispatch({ type: 'discard' })
  }

  const ready = suggestion.phase === 'ready'
  const overLimit = ready && exceedsRewriteLimit(suggestion.text, maxChars)
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <AiButton feature="rewrite" label="Reescribir con IA" busy={busy} disabled={text.trim().length < 3 || tooLong} onClick={() => setMenuOpen((open) => !open)} expanded={menuOpen} testId={testId} />
      {menuOpen && (
        <div role="group" aria-label="Cómo reescribir" onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)} className="flex flex-wrap gap-1.5">
          {REWRITE_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handlePick(mode)}
              data-testid={`${testId}-${mode}`}
              className="cursor-pointer rounded-md border border-orange-200 px-2 py-1 text-[11px] font-medium text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-900/20"
            >
              {REWRITE_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      )}
      {tooLong && <p className="text-[11px] text-gray-500 dark:text-gray-400">El texto es muy largo para reescribirlo (máximo 2,000 caracteres).</p>}
      {suggestion.phase !== 'idle' && (
        <div
          className="w-full rounded-md border border-orange-200 bg-orange-50/60 p-2 dark:border-orange-800 dark:bg-orange-900/10"
          aria-busy={!ready}
          data-testid={`${testId}-suggestion`}
        >
          <p className="whitespace-pre-line text-xs text-gray-800 dark:text-gray-200" aria-live={ready ? 'polite' : 'off'}>{suggestion.text || 'Escribiendo...'}</p>
          {overLimit && (
            <p className="mt-1 text-[11px] text-red-600 dark:text-red-400" role="alert" data-testid={`${testId}-too-long`}>
              La sugerencia pasa de {maxChars.toLocaleString('es-MX')} caracteres y no se puede usar. Descártala e inténtalo de nuevo.
            </p>
          )}
          <div className="mt-1.5 flex gap-2">
            <button type="button" onClick={handleDiscard} data-testid={`${testId}-discard`} className={`${ACTION_BASE} flex-1 border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300`}>
              Descartar
            </button>
            <button type="button" onClick={handleAccept} disabled={!ready || overLimit} data-testid={`${testId}-accept`} className={`${ACTION_BASE} flex-1 border-orange-500 bg-orange-500 text-white disabled:opacity-50`}>
              Usar
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-[11px] text-red-600 dark:text-red-400" role="alert" data-testid={`${testId}-error`}>{error}</p>}
    </div>
  )
}
