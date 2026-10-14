'use client'

import { useState } from 'react'
import { z } from 'zod'
import { AiButton } from '@/components/ai/ai-button'
import { useAiJson } from '@/hooks/use-ai-json'
import type { ShowcaseTexts } from '@/lib/ai/showcase-texts'

export type ShowcaseTextField = keyof ShowcaseTexts

interface AiShowcaseButtonProps {
  readonly onApply: (field: ShowcaseTextField, value: string) => void
  readonly disabled?: boolean
}

const textsSchema = z.object({ headline: z.string(), bio: z.string() }) satisfies z.ZodType<ShowcaseTexts>
const FIELD_LABELS: Readonly<Record<ShowcaseTextField, string>> = { headline: 'Frase corta', bio: 'Sobre ti o tu negocio' }
const FIELDS: readonly ShowcaseTextField[] = ['headline', 'bio']
const ACTION_BASE = 'cursor-pointer rounded-md border px-2 py-1 text-[11px] font-medium'

export function AiShowcaseButton({ onApply, disabled = false }: AiShowcaseButtonProps) {
  const [proposal, setProposal] = useState<ShowcaseTexts | null>(null)
  const [accepted, setAccepted] = useState(false)
  const { busy, error, elapsed, run } = useAiJson()

  async function generate(): Promise<void> {
    setAccepted(false)
    setProposal(null)
    const texts = await run('/api/ai/showcase-texts', {}, textsSchema)
    if (texts) setProposal(texts)
  }

  function accept(field: ShowcaseTextField): void {
    if (!proposal) return
    onApply(field, proposal[field])
    setAccepted(true)
    const rest = { ...proposal, [field]: '' }
    setProposal(rest.headline || rest.bio ? rest : null)
  }

  const visible = proposal ? FIELDS.filter((field) => proposal[field]) : []

  return (
    <div className="flex flex-col items-start gap-1">
      <AiButton feature="showcase_texts" label="Proponer textos con IA" busy={busy} onClick={generate} testId="vitrina-ai-generate" />
      {busy && <p className="text-[11px] text-gray-500 dark:text-gray-400" role="status">Escribiendo… {elapsed} s</p>}
      {error && <p className="text-[11px] text-red-600 dark:text-red-400" role="alert" data-testid="vitrina-ai-error">{error}</p>}
      {proposal && visible.length > 0 && (
        <div className="w-full space-y-2 rounded-md border border-orange-200 bg-orange-50/60 p-2 dark:border-orange-800 dark:bg-orange-900/10" data-testid="vitrina-ai-proposal">
          {visible.map((field) => (
            <div key={field} data-testid={`vitrina-ai-${field}`}>
              <p className="text-[11px] font-medium text-gray-600 dark:text-gray-400">{FIELD_LABELS[field]}</p>
              <p className="whitespace-pre-line text-xs text-gray-800 dark:text-gray-200">{proposal[field]}</p>
              <button type="button" onClick={() => accept(field)} disabled={disabled} data-testid={`vitrina-ai-accept-${field}`} className={`${ACTION_BASE} mt-1 border-orange-500 bg-orange-500 text-white disabled:opacity-50`}>
                Usar
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setProposal(null)} data-testid="vitrina-ai-discard" className={`${ACTION_BASE} w-full border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300`}>
            Descartar
          </button>
        </div>
      )}
      {accepted && <p className="text-[11px] text-amber-700 dark:text-amber-400" role="status" data-testid="vitrina-ai-notice">Revisa el texto y guarda la página</p>}
    </div>
  )
}
