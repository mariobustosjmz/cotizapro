import type { AiUsageSummary } from './usage'

export type AiBannerLevel = 'none' | 'warning' | 'exhausted'

export function aiBannerLevel(summary: Pick<AiUsageSummary, 'percent' | 'remaining'>, role: string): AiBannerLevel {
  if (role !== 'owner' && role !== 'admin') return 'none'
  if (summary.remaining <= 0 || summary.percent >= 100) return 'exhausted'
  if (summary.percent >= 80) return 'warning'
  return 'none'
}
