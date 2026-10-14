import { EXTRA_USER_MONTHLY_PRICE, PLANS, PLAN_ORDER } from '@/lib/plans/catalog'
import { planLimits } from '@/lib/plans/limits'
import { formatMxn } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'

function usersCell(planId: PlanId): string {
  const limits = planLimits(planId)
  return limits.allowsExtraUsers ? `${limits.includedUsers} + ${formatMxn(EXTRA_USER_MONTHLY_PRICE)} c/u` : String(limits.includedUsers)
}

function quotesCell(planId: PlanId): string {
  const monthly = planLimits(planId).monthlyQuotes
  return monthly === null ? 'Ilimitadas' : String(monthly)
}

const CELL = 'px-3 py-2 text-center text-gray-700 dark:text-gray-300'
const ROW_HEADER = 'px-3 py-2 text-left font-medium text-gray-900 dark:text-white'

export function PlanLimitsTable({ enforced }: { readonly enforced: boolean }) {
  return (
    <div data-testid="plan-limits-table" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">Qué incluye cada plan</h2>
      {!enforced && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Durante el piloto todas las funciones están abiertas en todos los planes.</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th scope="col" className={ROW_HEADER}>Límite</th>
              {PLAN_ORDER.map((planId) => (
                <th key={planId} scope="col" className={CELL}>{PLANS[planId].name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th scope="row" className={ROW_HEADER}>Usuarios</th>
              {PLAN_ORDER.map((planId) => <td key={planId} className={CELL}>{usersCell(planId)}</td>)}
            </tr>
            <tr>
              <th scope="row" className={ROW_HEADER}>Cotizaciones por mes</th>
              {PLAN_ORDER.map((planId) => <td key={planId} className={CELL}>{quotesCell(planId)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
