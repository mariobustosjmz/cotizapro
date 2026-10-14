export const FOLLOW_UP_STATUSES = ['sent', 'viewed'] as const
export const FOLLOW_UP_AFTER_DAYS = 2
const DAY_MS = 86_400_000

export function daysSinceSent(sentAt: string | null, now: Date): number | null {
  if (!sentAt) return null
  const sent = Date.parse(sentAt)
  if (Number.isNaN(sent)) return null
  return Math.floor((now.getTime() - sent) / DAY_MS)
}

export function isFollowUpEligible(status: string, sentAt: string | null, now: Date): boolean {
  if (!(FOLLOW_UP_STATUSES as readonly string[]).includes(status) || !sentAt) return false
  const sent = Date.parse(sentAt)
  return !Number.isNaN(sent) && now.getTime() - sent > FOLLOW_UP_AFTER_DAYS * DAY_MS
}

export function followUpCutoff(now: Date): string {
  return new Date(now.getTime() - FOLLOW_UP_AFTER_DAYS * DAY_MS).toISOString()
}
