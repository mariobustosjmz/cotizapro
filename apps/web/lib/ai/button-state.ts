import type { AiStatusView } from './status-cache'

export type AiButtonKind = 'loading' | 'unavailable' | 'no_credits' | 'ready'

export function aiButtonKind(status: AiStatusView | null, credits: number): AiButtonKind {
  if (!status) return 'loading'
  if (!status.available) return 'unavailable'
  if (status.enforced && status.remaining < credits) return 'no_credits'
  return 'ready'
}
