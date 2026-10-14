'use client'

import { useCallback, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, Check } from 'lucide-react'
import type { PlanId } from '@/lib/plans/types'
import type { PlanCheckoutOption } from '@/lib/billing/types'
import { plansIntro } from '@/lib/billing/checkout-option'
import { PlanSelector } from '@/components/billing/PlanSelector'
import { BillingHistory } from '@/components/billing/BillingHistory'
import { Button } from '@/components/ui/button'

interface BillingClientProps {
  readonly currentPlan: PlanId
  readonly activeUsers: number
  readonly options: Readonly<Record<PlanId, PlanCheckoutOption>>
  readonly mercadoPagoEnabled: boolean
  readonly canManage: boolean
  readonly hasBillingAccount: boolean
}

interface Notice {
  readonly type: 'success' | 'error'
  readonly text: string
}

async function postForUrl(endpoint: string, body: Record<string, unknown>): Promise<{ url?: string; error?: string }> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data: { url?: string | null; error?: string } = await response.json()
  if (!response.ok || !data.url) return { error: data.error || 'No se pudo continuar. Intenta de nuevo.' }
  return { url: data.url }
}

export function BillingClient({ currentPlan, activeUsers, options, mercadoPagoEnabled, canManage, hasBillingAccount }: BillingClientProps) {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const redirectTo = useCallback(async (endpoint: string, body: Record<string, unknown>) => {
    setLoading(true)
    setNotice(null)
    try {
      const result = await postForUrl(endpoint, body)
      if (result.url) {
        window.location.href = result.url
        return
      }
      setNotice({ type: 'error', text: result.error ?? 'No se pudo continuar' })
    } catch {
      setNotice({ type: 'error', text: 'Error de conexión. Intenta de nuevo.' })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSelectPlan = useCallback(
    (planId: PlanId) => redirectTo('/api/billing/checkout', { planId }),
    [redirectTo]
  )

  return (
    <div className="space-y-6">
      {searchParams.get('success') && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">Pago recibido. Tu plan se actualiza en unos momentos.</p>
        </div>
      )}
      {searchParams.get('canceled') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">Cancelaste el pago. Puedes elegir un plan cuando quieras.</p>
        </div>
      )}
      {notice && (
        <div className={`rounded-lg p-4 flex gap-3 border ${notice.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${notice.type === 'error' ? 'text-red-600' : 'text-green-600'}`} />
          <p className={`text-sm ${notice.type === 'error' ? 'text-red-700' : 'text-green-700'}`}>{notice.text}</p>
        </div>
      )}

      <div>
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">Planes</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{plansIntro(mercadoPagoEnabled, options)}</p>
        <PlanSelector
          currentPlan={currentPlan}
          activeUsers={activeUsers}
          options={options}
          canManage={canManage}
          onSelectPlan={handleSelectPlan}
          loading={loading}
        />
      </div>

      {hasBillingAccount && canManage && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2">Métodos de pago</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Tarjetas y datos de facturación en el portal de Stripe.</p>
          <Button onClick={() => redirectTo('/api/billing/portal', { returnUrl: window.location.href })} disabled={loading}>
            Abrir portal de pagos
          </Button>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Historial de pagos</h2>
        <BillingHistory />
      </div>
    </div>
  )
}
