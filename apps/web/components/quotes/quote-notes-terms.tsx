'use client'

import { useState } from 'react'
import { ChevronDown, Zap } from 'lucide-react'
import { AiRewriteButton } from '@/components/ai/ai-rewrite-button'
import { Textarea } from '@/components/ui/textarea'

interface QuoteNotesTermsProps {
  readonly notes: string
  readonly terms: string
  readonly onNotesChange: (value: string) => void
  readonly onTermsChange: (value: string) => void
  /** Abre la sección cuando la cotización ya trae notas o términos (edición); después manda la persona. */
  readonly autoOpen?: boolean
}

const LABEL = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400'

export function QuoteNotesTerms({ notes, terms, onNotesChange, onTermsChange, autoOpen = false }: QuoteNotesTermsProps) {
  const [toggled, setToggled] = useState<boolean | null>(null)
  const [latched, setLatched] = useState(false)
  if (autoOpen && !latched) setLatched(true)
  const open = toggled ?? latched

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => setToggled(!open)}
        aria-expanded={open}
        data-testid="quote-notes-toggle"
        className="flex w-full cursor-pointer items-center justify-between px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Notas y Términos</span>
          {(notes || terms) && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-gray-100 px-4 pb-3 pt-3 dark:border-gray-700">
          <div className="space-y-1">
            <label htmlFor="quote-notes" className={LABEL}>Notas</label>
            <Textarea id="quote-notes" value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={2} placeholder="Información adicional..." className="resize-none text-sm" data-testid="quote-notes" />
            <AiRewriteButton text={notes} context="quote_notes" onChange={onNotesChange} testId="ai-rewrite-notes" />
          </div>
          <div className="space-y-1">
            <label htmlFor="quote-terms" className={LABEL}>Términos y condiciones</label>
            <Textarea id="quote-terms" value={terms} onChange={(e) => onTermsChange(e.target.value)} rows={2} className="resize-none text-sm" data-testid="quote-terms" />
            <AiRewriteButton text={terms} context="quote_terms" onChange={onTermsChange} testId="ai-rewrite-terms" />
          </div>
        </div>
      )}
    </div>
  )
}
