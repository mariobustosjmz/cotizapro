import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { aiBannerLevel } from '@/lib/ai/banner'
import { formatResetDate } from '@/lib/ai/period'
import { getUsageSummary } from '@/lib/ai/usage'
import { logger } from '@/lib/logger'
import { createServerClient } from '@/lib/supabase/server'

const STYLES = {
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300',
  exhausted: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300',
} as const

export async function AiUsageBanner({ role }: { readonly role: string }) {
  const supabase = await createServerClient()
  const summary = await getUsageSummary(supabase).catch((error: unknown) => {
    logger.warn('ai banner summary failed', { reason: error instanceof Error ? error.message : 'unknown' })
    return null
  })
  if (!summary) return null
  const level = aiBannerLevel(summary, role)
  if (level === 'none') return null
  const text =
    level === 'exhausted'
      ? `Usaste tus créditos de IA de este mes. Se reinician el ${formatResetDate(summary.resets_on)}.`
      : `Llevas el ${summary.percent} % de tus créditos de IA de este mes.`
  return (
    <Link
      href="/dashboard/billing#ia"
      role="status"
      data-testid="ai-usage-banner"
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${STYLES[level]}`}
    >
      <Sparkles className="w-4 h-4 shrink-0" aria-hidden />
      <span className="flex-1 min-w-0">{text}</span>
      <span className="font-semibold shrink-0">{level === 'exhausted' ? 'Obtener más' : 'Ver uso'}</span>
    </Link>
  )
}
