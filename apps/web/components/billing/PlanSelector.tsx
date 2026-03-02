'use client'

import { useState } from 'react'
import { PLANS, PlanId } from '@/lib/stripe/index'
import {
  formatPrice,
  formatUsageLimit,
  isUnlimited,
} from '@/lib/stripe/helpers'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

interface PlanSelectorProps {
  currentPlan: PlanId | null
  onSelectPlan: (planId: PlanId) => Promise<void>
  loading?: boolean
}

export function PlanSelector({
  currentPlan,
  onSelectPlan,
  loading = false,
}: PlanSelectorProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(currentPlan)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSelectPlan = async (planId: PlanId) => {
    if (planId === currentPlan) return

    setIsProcessing(true)
    try {
      await onSelectPlan(planId)
    } finally {
      setIsProcessing(false)
    }
  }

  const planIds: PlanId[] = ['free', 'starter', 'pro', 'enterprise']

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {planIds.map((planId) => {
        const plan = PLANS[planId]
        const isCurrent = planId === currentPlan
        const isSelected = planId === selectedPlan

        return (
          <div
            key={planId}
            className={`relative rounded-lg border-2 p-6 transition-all ${
              isCurrent
                ? 'border-blue-500 bg-blue-50'
                : isSelected
                  ? 'border-blue-400 bg-white'
                  : 'border-gray-200 bg-white'
            }`}
          >
            {isCurrent && (
              <div className="absolute -top-3 left-4 bg-blue-500 px-3 py-1 rounded-full text-white text-xs font-semibold">
                Current Plan
              </div>
            )}

            <h3 className="text-lg font-bold mt-2">{plan.name}</h3>

            <div className="my-4">
              {plan.price !== null ? (
                <div>
                  <div className="text-3xl font-bold">
                    {formatPrice(plan.price)}
                  </div>
                  <div className="text-sm text-gray-600">/month</div>
                </div>
              ) : (
                <div className="text-2xl font-bold text-gray-700">
                  Custom Pricing
                </div>
              )}
            </div>

            <div className="space-y-3 my-6">
              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">
                  Limits
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Projects:</span>
                    <span className="font-medium">
                      {formatUsageLimit(plan.limits.projects)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">API Calls/day:</span>
                    <span className="font-medium">
                      {formatUsageLimit(plan.limits.apiCalls)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm text-gray-700 mb-2">
                  Features
                </h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {planId !== 'free' && (
              <Button
                onClick={() => handleSelectPlan(planId)}
                disabled={isCurrent || isProcessing || loading}
                variant={isCurrent ? 'outline' : 'default'}
                className="w-full mt-4"
              >
                {isCurrent ? 'Current Plan' : 'Select Plan'}
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
