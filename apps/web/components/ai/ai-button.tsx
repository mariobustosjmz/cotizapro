'use client'

import Link from 'next/link'
import { Loader2, Sparkles } from 'lucide-react'
import { useAiStatus } from '@/hooks/use-ai-status'
import { aiButtonKind } from '@/lib/ai/button-state'
import { AI_FEATURES, creditsLabel, type AiFeatureId } from '@/lib/ai/features'

interface AiButtonProps {
  readonly feature: AiFeatureId
  readonly label: string
  readonly busy: boolean
  readonly disabled?: boolean
  readonly onClick: () => void
  readonly testId: string
  readonly expanded?: boolean
}

const BASE =
  'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export function AiButton({ feature, label, busy, disabled = false, onClick, testId, expanded }: AiButtonProps) {
  const credits = AI_FEATURES[feature].credits
  const status = useAiStatus()
  const kind = aiButtonKind(status, credits)

  if (kind === 'no_credits') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
        <button type="button" disabled data-testid={testId} className={`${BASE} border-gray-200 dark:border-gray-700`}>
          Sin créditos este mes
        </button>
        ·
        <Link href="/dashboard/billing#ia" className="text-orange-600 hover:underline dark:text-orange-400">
          Obtener más
        </Link>
      </span>
    )
  }

  const text = kind === 'unavailable' ? 'La IA no está disponible por ahora' : `${label} · ${creditsLabel(credits)}`
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={kind !== 'ready' || busy || disabled}
      aria-busy={busy}
      aria-expanded={expanded}
      data-testid={testId}
      className={`${BASE} cursor-pointer border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-900/20`}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <Sparkles className="h-3 w-3" aria-hidden />}
      {text}
    </button>
  )
}
