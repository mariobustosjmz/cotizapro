'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { useAiJson } from '@/hooks/use-ai-json'
import { draftSummaryText, type DraftApplySummary } from '@/lib/ai/whatsapp/apply-draft'
import type { DraftResult } from '@/lib/ai/whatsapp/draft-result'
import { DRAFT_MESSAGE_MAX, draftMessageError, isDraftMessageTooLong } from '@/lib/ai/whatsapp/draft-message'
import { draftResultSchema } from '@/lib/ai/whatsapp/result-schema'
import { AiButton } from './ai-button'

interface WhatsappDraftPanelProps {
  readonly onApply: (result: DraftResult) => DraftApplySummary
}

// Medido con gemma3:4b: ~10 s con el modelo cargado y ~22 s si estaba descargado.
const SLOW_AFTER_SECONDS = 10
const TEXTAREA_BASE = 'w-full px-3 py-2 rounded-lg border text-sm dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
const TEXTAREA_OK = 'border-gray-300 dark:border-gray-700'
const TEXTAREA_ERROR = 'border-red-500 bg-red-50'

function waitingText(elapsed: number): string {
  return `Leyendo el mensaje… ${elapsed} s${elapsed >= SLOW_AFTER_SECONDS ? ' (la primera vez del día puede tardar hasta 30 s)' : ''}`
}

interface MessageFieldProps {
  readonly message: string
  readonly fieldError: string | null
  readonly status: string
  readonly onChange: (value: string) => void
}

function MessageField({ message, fieldError, status, onChange }: MessageFieldProps) {
  return (
    <>
      <label htmlFor="whatsapp-draft-message" className="block text-xs text-gray-600 dark:text-gray-300">
        Mensaje del cliente *
        <span className="block text-gray-500 dark:text-gray-400">Pega el mensaje de WhatsApp; la IA arma las partidas y tú pones o revisas los precios del catálogo.</span>
      </label>
      <textarea
        id="whatsapp-draft-message"
        value={message}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        aria-invalid={fieldError !== null}
        aria-describedby={fieldError ? 'whatsapp-draft-message-error' : undefined}
        data-testid="whatsapp-draft-message"
        className={`${TEXTAREA_BASE} ${fieldError ? TEXTAREA_ERROR : TEXTAREA_OK}`}
      />
      <div className="flex items-center justify-between gap-2 text-[11px]">
        {fieldError ? (
          <p id="whatsapp-draft-message-error" className="text-red-600" data-testid="whatsapp-draft-field-error">{fieldError}</p>
        ) : (
          <span className="text-gray-500 dark:text-gray-400" role="status">{status}</span>
        )}
        <span className={`shrink-0 tabular-nums ${isDraftMessageTooLong(message) ? 'text-red-600' : 'text-gray-400'}`}>{message.length.toLocaleString('es-MX')}/{DRAFT_MESSAGE_MAX.toLocaleString('es-MX')}</span>
      </div>
    </>
  )
}

/** Solo arma un borrador en el formulario: no crea clientes ni cotizaciones hasta que la persona guarda. */
export function WhatsappDraftPanel({ onApply }: WhatsappDraftPanelProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const { busy, error, elapsed, abort, run } = useAiJson()
  // Sin maxLength: un chat cortado se cobraría igual; el límite se ve y el botón queda desactivado.
  const tooLong = isDraftMessageTooLong(message)
  const shownError = fieldError ?? (tooLong ? draftMessageError(message) : null)

  async function submit(): Promise<void> {
    const invalid = draftMessageError(message)
    setFieldError(invalid)
    if (invalid) return
    setSummary(null)
    const result = await run('/api/ai/whatsapp-draft', { message }, draftResultSchema)
    if (!result) return
    setSummary(draftSummaryText(onApply(result)))
    setMessage('')
    setOpen(false)
  }

  /** Cerrar mientras la IA trabaja cancela la petición (no se cobra) y limpia errores viejos. */
  function close(): void {
    abort()
    setFieldError(null)
    setOpen(false)
  }

  function discard(): void {
    close()
    setMessage('')
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2" data-testid="whatsapp-draft-panel">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        data-testid="whatsapp-draft-toggle"
        className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
      >
        <MessageSquare className="w-4 h-4 text-orange-500" aria-hidden />
        Pegar mensaje del cliente
      </button>
      {open && (
        <>
          <MessageField
            message={message}
            fieldError={shownError}
            status={busy ? waitingText(elapsed) : 'La IA no pone precios: salen de tu catálogo.'}
            onChange={(value) => {
              setMessage(value)
              setFieldError(null)
            }}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={discard}
              data-testid="whatsapp-draft-discard"
              className="rounded-md border border-gray-300 dark:border-gray-600 px-2 py-1 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              Descartar
            </button>
            <AiButton feature="whatsapp_draft" label="Armar borrador" busy={busy} disabled={tooLong} onClick={submit} testId="whatsapp-draft-submit" />
          </div>
        </>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400" role="alert" data-testid="whatsapp-draft-error">{error}</p>}
      {summary && (
        <div className="text-xs text-amber-700 dark:text-amber-400" role="status">
          <p data-testid="whatsapp-draft-notice">Revisa cantidades y medidas antes de guardar</p>
          <p data-testid="whatsapp-draft-summary">{summary}</p>
        </div>
      )}
    </div>
  )
}
