import Stripe from 'stripe'

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
      apiVersion: '2026-01-28.clover' as any,
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

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      '3 projects',
      '100 API calls/day',
      'Basic support',
    ],
    limits: {
      projects: 3,
      apiCalls: 100,
    },
  },
  starter: {
    name: 'Starter',
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: [
      '10 projects',
      '10,000 API calls/day',
      'Email support',
      'Team collaboration',
    ],
    limits: {
      projects: 10,
      apiCalls: 10000,
    },
  },
  pro: {
    name: 'Pro',
    price: 99,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      'Unlimited projects',
      'Unlimited API calls',
      'Priority support',
      'Advanced analytics',
      'Custom integrations',
    ],
    limits: {
      projects: -1, // unlimited
      apiCalls: -1, // unlimited
    },
  },
  enterprise: {
    name: 'Enterprise',
    price: null, // custom pricing
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Everything in Pro',
      'Dedicated support',
      'SLA guarantee',
      'Custom contracts',
      'On-premise deployment',
    ],
    limits: {
      projects: -1,
      apiCalls: -1,
    },
  },
} as const

export type PlanId = keyof typeof PLANS
