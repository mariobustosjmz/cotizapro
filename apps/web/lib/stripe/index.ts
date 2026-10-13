import Stripe from 'stripe'
import type { PlanId } from '@/lib/plans/types'

let stripeInstance: Stripe | null = null

/**
 * Get or create Stripe instance.
 * Lazy-initializes to avoid errors during build when STRIPE_SECRET_KEY is not available.
 */
function getStripeInstance(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY
    if (!apiKey) {
      throw new Error(
        'STRIPE_SECRET_KEY environment variable is not set. ' +
        'Please configure your Stripe API key in environment variables.'
      )
    }
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

/**
 * Lazy-loaded Stripe client.
 * Only initializes when first used, avoiding build-time errors.
 */
export function getStripe(): Stripe {
  return getStripeInstance()
}

/**
 * Direct Stripe access.
 * Lazily initializes on first property access while maintaining type safety.
 */
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop: string | symbol) {
    const instance = getStripeInstance()
    const value = instance[prop as keyof Stripe]
    // Bind methods to the instance to preserve 'this' context
    return typeof value === 'function' ? value.bind(instance) : value
  },
})

export type { PlanId } from '@/lib/plans/types'

/** Precio mensual de Stripe por plan; los planes de pago se configuran por variable de entorno. */
export function planPriceId(planId: PlanId): string | null {
  const ids: Readonly<Record<PlanId, string | undefined>> = {
    free: undefined,
    starter: process.env.STRIPE_STARTER_PRICE_ID,
    pro: process.env.STRIPE_PRO_PRICE_ID,
    enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  }
  return ids[planId] || null
}

/** Precio recurrente de Stripe por usuario adicional; se cobra por cantidad. */
export function extraUserPriceId(): string | null {
  return process.env.STRIPE_EXTRA_USER_PRICE_ID || null
}

/** El cobro en línea solo se ofrece cuando Stripe y todos los precios están configurados. */
export function isCheckoutConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      planPriceId('starter') &&
      planPriceId('pro') &&
      planPriceId('enterprise') &&
      extraUserPriceId()
  )
}
