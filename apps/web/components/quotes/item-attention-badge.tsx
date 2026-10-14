import { AlertTriangle } from 'lucide-react'
import { itemAttention } from '@/lib/quotes/form-items'
import type { QuoteFormItem } from '@/types/quote-form'

interface ItemAttentionBadgeProps {
  readonly item: QuoteFormItem
  readonly index: number
}

/** Aviso por partida del borrador: sin precio del catálogo o pendiente de revisar. Bloquea guardar hasta corregirse. */
export function ItemAttentionBadge({ item, index }: ItemAttentionBadgeProps) {
  const attention = itemAttention(item)
  if (!attention) return null
  const testId = attention.kind === 'catalog' ? `item-needs-catalog-${index}` : `item-needs-review-${index}`
  return (
    <p className="mx-3 mb-2 inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-[11px] text-amber-800 dark:text-amber-300" data-testid={testId}>
      <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />
      {attention.text}
    </p>
  )
}
