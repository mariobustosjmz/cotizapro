import Link from 'next/link'
import { Clock } from 'lucide-react'
import type { PendingFollowUp } from '@/lib/ai/follow-up/pending'

export function FollowUpPending({ items }: { readonly items: readonly PendingFollowUp[] }) {
  if (items.length === 0) return null
  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4" data-testid="follow-up-pending">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white mb-2">
        <Clock className="w-4 h-4 text-orange-500" aria-hidden />
        Pendientes de seguimiento
      </h2>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={`/dashboard/quotes/${item.id}#seguimiento`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-orange-600 dark:hover:text-orange-400">
              <span className="truncate text-gray-900 dark:text-white">{item.quoteNumber} · {item.clientName ?? 'Cliente'}</span>
              <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">hace {item.days} días</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
