'use client'

import { useCallback, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PlanId } from '@/lib/stripe/index'
import { PlanSelector } from '@/components/billing/PlanSelector'
import { BillingHistory } from '@/components/billing/BillingHistory'
import { Button } from '@/components/ui/button'
import { AlertCircle, Check } from 'lucide-react'

interface BillingClientProps {
  currentPlan: PlanId
  organizationId: string
  subscriptionStatus: string
}

export function BillingClient({
  currentPlan,
  organizationId,
  subscriptionStatus,
}: BillingClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const successMessage = searchParams.get('success')
  const canceledMessage = searchParams.get('canceled')

  const handleSelectPlan = useCallback(
    async (planId: PlanId) => {
      if (planId === 'free') {
        setMessage({
          type: 'error',
          text: 'El plan gratuito no puede seleccionarse desde esta página',
        })
        return
      }

      setLoading(true)
      setMessage(null)

      try {
        const response = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId }),
        })

        const data = await response.json()

        if (!response.ok) {
          setMessage({
            type: 'error',
            text: data.error || 'Failed to create checkout session',
          })
          return
        }

        if (data.sessionId) {
          window.location.href = `https://checkout.stripe.com/pay/${data.sessionId}`
        }
      } catch (error) {
        setMessage({
          type: 'error',
          text: 'An error occurred. Please try again.',
        })
        console.error(error)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const handleManagePaymentMethods = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to open billing portal',
        })
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An error occurred. Please try again.',
      })
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-900">Payment successful!</h3>
            <p className="text-sm text-green-700">
              Your subscription has been updated. It may take a moment for your
              plan to reflect.
            </p>
          </div>
        </div>
      )}

      {canceledMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Checkout canceled</h3>
            <p className="text-sm text-blue-700">
              You've canceled the checkout. Select a plan below to try again.
            </p>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`rounded-lg p-4 flex gap-3 ${
            message.type === 'error'
              ? 'bg-red-50 border border-red-200'
              : 'bg-green-50 border border-green-200'
          }`}
        >
          {message.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p
              className={`text-sm ${
                message.type === 'error'
                  ? 'text-red-700'
                  : 'text-green-700'
              }`}
            >
              {message.text}
            </p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6">Select Your Plan</h2>
        <PlanSelector
          currentPlan={currentPlan}
          onSelectPlan={handleSelectPlan}
          loading={loading}
        />
      </div>

      {currentPlan !== 'free' && subscriptionStatus !== 'canceled' && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-2xl font-bold mb-4">Payment Methods</h2>
          <p className="text-gray-600 mb-4">
            Manage your payment methods and billing details in the Stripe portal
          </p>
          <Button onClick={handleManagePaymentMethods} disabled={loading}>
            Open Billing Portal
          </Button>
        </div>
      )}

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-2xl font-bold mb-6">Billing History</h2>
        <BillingHistory />
      </div>
    </div>
  )
}
