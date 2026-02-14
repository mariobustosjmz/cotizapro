import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
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
