'use client'

import { useEffect, useReducer, useRef } from 'react'
import { useAiText } from '@/hooks/use-ai-text'
import { AiButton } from './ai-button'
import { IDLE_SUGGESTION, suggestionFor, suggestionReducer } from './describe-suggestion'

interface AiDescribeButtonProps {
  readonly description: string
  readonly serviceName: string | null
  readonly onChange: (text: string) => void
  readonly testId: string
}

const ACTION_BASE = 'cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium'

export function AiDescribeButton({ description, serviceName, onChange, testId }: AiDescribeButtonProps) {
  const { busy, error, abort, run } = useAiText()
  const [state, dispatch] = useReducer(suggestionReducer, IDLE_SUGGESTION)
  const requestRef = useRef(0)
  const suggestion = suggestionFor(state, description)
  const stale = state.phase !== 'idle' && suggestion.phase === 'idle'

  useEffect(() => {
    if (!stale) return
    abort()
    dispatch({ type: 'discard' })
  }, [stale, abort])

  async function handleClick(): Promise<void> {
    const requestId = ++requestRef.current
    dispatch({ type: 'start', requestId, source: description })
    const text = await run('/api/ai/describe-item', { description, serviceName }, (partial) => dispatch({ type: 'text', requestId, text: partial }))
    dispatch({ type: 'finish', requestId, text })
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
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <AiButton feature="describe_item" label="Mejorar con IA" busy={busy} disabled={description.trim().length < 3} onClick={handleClick} testId={testId} />
      {suggestion.phase !== 'idle' && (
        <div
          className="w-full rounded-md border border-orange-200 bg-orange-50/60 p-2 dark:border-orange-800 dark:bg-orange-900/10"
          aria-busy={!ready}
          data-testid={`${testId}-suggestion`}
        >
          <p className="text-xs text-gray-800 dark:text-gray-200" aria-live={ready ? 'polite' : 'off'}>{suggestion.text || 'Escribiendo...'}</p>
          <div className="mt-1.5 flex gap-2">
            <button type="button" onClick={handleDiscard} data-testid={`${testId}-discard`} className={`${ACTION_BASE} flex-1 border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300`}>
              Descartar
            </button>
            <button type="button" onClick={handleAccept} disabled={!ready} data-testid={`${testId}-accept`} className={`${ACTION_BASE} flex-1 border-orange-500 bg-orange-500 text-white disabled:opacity-50`}>
              Usar
            </button>
          </div>
        </div>
      )}
      {error && <p className="text-[11px] text-red-600 dark:text-red-400" role="alert" data-testid={`${testId}-error`}>{error}</p>}
    </div>
  )
}
