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
      '3 proyectos',
      '100 llamadas API/día',
      'Soporte básico',
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
      '10 proyectos',
      '10,000 llamadas API/día',
      'Soporte por email',
      'Colaboración en equipo',
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
      'Proyectos ilimitados',
      'Llamadas API ilimitadas',
      'Soporte prioritario',
      'Analytics avanzado',
      'Integraciones personalizadas',
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
      'Todo lo de Pro',
      'Soporte dedicado',
      'Garantía de SLA',
      'Contratos personalizados',
      'Despliegue on-premise',
    ],
    limits: {
      projects: -1,
      apiCalls: -1,
    },
  },
} as const

export type PlanId = keyof typeof PLANS
