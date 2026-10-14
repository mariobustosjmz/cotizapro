'use client'

import { Check, Clock } from 'lucide-react'
import { PLANS, PLAN_ORDER } from '@/lib/plans/catalog'
import { formatMxn, monthlyCost, usersLabel } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'
import type { PlanCheckoutOption } from '@/lib/billing/types'
import { PlanCta } from './plan-cta'

interface PlanSelectorProps {
  readonly currentPlan: PlanId
  readonly activeUsers: number
  readonly options: Readonly<Record<PlanId, PlanCheckoutOption>>
  readonly canManage: boolean
  readonly loading?: boolean
  readonly onSelectPlan: (planId: PlanId) => Promise<void>
}

interface PlanCardProps extends Omit<PlanSelectorProps, 'currentPlan' | 'options'> {
  readonly planId: PlanId
  readonly isCurrent: boolean
  readonly option: PlanCheckoutOption
}

function PlanCard({ planId, isCurrent, option, activeUsers, canManage, loading = false, onSelectPlan }: PlanCardProps) {
  const plan = PLANS[planId]
  const estimate = monthlyCost(planId, activeUsers)
  return (
    <div
      data-testid={`plan-card-${planId}`}
      className={`relative flex flex-col rounded-xl border-2 p-5 bg-white dark:bg-gray-900 ${isCurrent ? 'border-orange-500' : 'border-gray-200 dark:border-gray-700'}`}
    >
      {isCurrent && (
        <span className="absolute -top-3 left-4 bg-orange-500 px-3 py-0.5 rounded-full text-white text-xs font-semibold">Plan actual</span>
      )}
      <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">{plan.name}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">{plan.tagline}</p>
      <div className="my-3">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatMxn(plan.monthlyPrice)}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">/mes</span>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{usersLabel(planId)}</p>
        {estimate.extraUsers > 0 && (
          <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mt-1">Con tus {estimate.activeUsers} usuarios: {formatMxn(estimate.total)}/mes</p>
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
            <span>{feature} <span className="text-[10px] font-semibold uppercase text-orange-600 dark:text-orange-400">Próximamente</span></span>
          </li>
        ))}
      </ul>
      <PlanCta planId={planId} option={option} canManage={canManage} loading={loading} onSelectPlan={onSelectPlan} />
    </div>
  )
}

export function PlanSelector({ currentPlan, options, ...rest }: PlanSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      {PLAN_ORDER.map((planId) => (
        <PlanCard key={planId} planId={planId} isCurrent={planId === currentPlan} option={options[planId]} {...rest} />
      ))}
    </div>
  )
}
