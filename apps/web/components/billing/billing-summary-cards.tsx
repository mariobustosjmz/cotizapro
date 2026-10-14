import { EXTRA_USER_MONTHLY_PRICE } from '@/lib/plans/catalog'
import { formatMxn } from '@/lib/plans/pricing'
import type { MonthlyCost } from '@/lib/plans/types'
import type { BillingBadge } from '@/lib/billing/types'

const BADGE_CLASS: Readonly<Record<BillingBadge['tone'], string>> = {
  success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
}

const CARD_CLASS = 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4'
const LABEL_CLASS = 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1'

interface BillingSummaryCardsProps {
  readonly planName: string
  readonly statusLine: string
  readonly badge: BillingBadge
  readonly cost: MonthlyCost
}

export function BillingSummaryCards({ planName, statusLine, badge, cost }: BillingSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className={CARD_CLASS}>
        <p className={LABEL_CLASS}>Plan actual</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{planName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${BADGE_CLASS[badge.tone]}`}>{badge.label}</span>
          <span data-testid="plan-status-line" className="text-xs text-gray-500 dark:text-gray-400">{statusLine}</span>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <p className={LABEL_CLASS}>Usuarios</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">
          {cost.activeUsers} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">de {cost.includedUsers} incluidos</span>
        </p>
        {cost.extraUsers > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cost.extraUsers} adicionales × {formatMxn(EXTRA_USER_MONTHLY_PRICE)}</p>
        )}
        {cost.overLimit > 0 && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">El plan {planName} es para 1 persona: cambia a Taller para sumar equipo</p>
        )}
      </div>

      <div className={CARD_CLASS}>
        <p className={LABEL_CLASS}>Total mensual estimado</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatMxn(cost.total)}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Plan {formatMxn(cost.basePrice)}{cost.extraUsers > 0 ? ` + usuarios ${formatMxn(cost.extraUsersCost)}` : ''}
        </p>
      </div>
    </div>
  )
}
