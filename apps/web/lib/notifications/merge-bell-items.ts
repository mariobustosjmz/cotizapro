import type { BellItem } from './types'

const byDateDesc = (a: BellItem, b: BellItem): number =>
  new Date(b.date).getTime() - new Date(a.date).getTime()

/**
 * Unread client responses always come first and are never truncated, so the
 * badge count never exceeds the clickable items. The rest is sorted by date.
 */
export function mergeBellItems(
  unreadResponses: readonly BellItem[],
  others: readonly BellItem[],
  limit: number,
): readonly BellItem[] {
  const unreadIds = new Set(unreadResponses.map((item) => item.id))
  const rest = others.filter((item) => !unreadIds.has(item.id)).sort(byDateDesc)
  const pinned = [...unreadResponses].sort(byDateDesc)
  return [...pinned, ...rest].slice(0, Math.max(limit, pinned.length))
}
