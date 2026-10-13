'use client'

import { Check, Clock } from 'lucide-react'
import { PLANS, PLAN_ORDER } from '@/lib/plans/catalog'
import { formatMxn, monthlyCost, usersLabel } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'
import { Button } from '@/components/ui/button'

interface PlanSelectorProps {
  readonly currentPlan: PlanId
  readonly activeUsers: number
  readonly onSelectPlan: (planId: PlanId) => Promise<void>
  readonly selectable: boolean
  readonly loading?: boolean
}

function buttonLabel(planId: PlanId, isCurrent: boolean, selectable: boolean): string {
  if (isCurrent) return 'Plan actual'
  if (planId === 'free') return 'Incluido'
  return selectable ? 'Elegir plan' : 'Próximamente'
}

export function PlanSelector({ currentPlan, activeUsers, onSelectPlan, selectable, loading = false }: PlanSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {PLAN_ORDER.map((planId) => {
        const plan = PLANS[planId]
        const isCurrent = planId === currentPlan
        const estimate = monthlyCost(planId, activeUsers)
        const canChoose = selectable && !isCurrent && planId !== 'free'

        return (
          <div
            key={planId}
            data-testid={`plan-card-${planId}`}
            className={`relative flex flex-col rounded-xl border-2 p-5 bg-white dark:bg-gray-900 ${
              isCurrent ? 'border-orange-500' : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {isCurrent && (
              <span className="absolute -top-3 left-4 bg-orange-500 px-3 py-0.5 rounded-full text-white text-xs font-semibold">
                Plan actual
              </span>
            )}
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">{plan.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{plan.tagline}</p>

            <div className="my-3">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatMxn(plan.monthlyPrice)}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">/mes</span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{usersLabel(planId)}</p>
              {estimate.extraUsers > 0 && (
                <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mt-1">
                  Con tus {estimate.activeUsers} usuarios: {formatMxn(estimate.total)}/mes
                </p>
              )}
              {estimate.overLimit > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No alcanza para tus {estimate.activeUsers} usuarios</p>
              )}
            </div>

            <ul className="space-y-1.5 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
              {plan.upcoming.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-400 dark:text-gray-500">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>
                    {feature} <span className="text-[10px] font-semibold uppercase text-orange-600 dark:text-orange-400">Próximamente</span>
                  </span>
                </li>
              ))}
            </ul>

            <Button
              onClick={canChoose ? () => onSelectPlan(planId) : undefined}
              disabled={!canChoose || loading}
              variant={isCurrent ? 'outline' : 'default'}
              className="w-full mt-4"
            >
              {buttonLabel(planId, isCurrent, selectable)}
            </Button>
          </div>
        )
      })}
    </div>
  )
}
