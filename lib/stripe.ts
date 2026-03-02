import Stripe from 'stripe'

// Only initialize Stripe if we have a secret key (not during build)
const secretKey = process.env.STRIPE_SECRET_KEY

export const stripe = secretKey
  ? new Stripe(secretKey, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    })
  : ({} as Stripe) // Dummy object when key is not available

export const STRIPE_PRICE_IDS = {
  free: process.env.STRIPE_PRICE_ID_FREE || '',
  starter: process.env.STRIPE_PRICE_ID_STARTER || '',
  professional: process.env.STRIPE_PRICE_ID_PRO || '',
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
}

export const STRIPE_PLANS = [
  {
    name: 'Gratuito',
    price: 0,
    priceId: STRIPE_PRICE_IDS.free,
    features: [
      '5 cotizaciones al mes',
      '10 clientes',
      '3 servicios',
      'Exportar PDF',
    ],
  },
  {
    name: 'Inicio',
    price: 299,
    priceId: STRIPE_PRICE_IDS.starter,
    features: [
      '50 cotizaciones al mes',
      'Clientes ilimitados',
      'Servicios ilimitados',
      'Exportar PDF',
      'Recordatorios',
      'Plantillas',
    ],
  },
  {
    name: 'Profesional',
    price: 599,
    priceId: STRIPE_PRICE_IDS.professional,
    popular: true,
    features: [
      'Cotizaciones ilimitadas',
      'Clientes ilimitados',
      'Servicios ilimitados',
      'Exportar PDF',
      'Recordatorios',
      'Plantillas',
      'Integraciones (Email, WhatsApp)',
      'Analíticas avanzadas',
    ],
  },
  {
    name: 'Empresa',
    price: 1299,
    priceId: STRIPE_PRICE_IDS.enterprise,
    features: [
      'Todo en Profesional',
      'Equipos y colaboradores',
      'API de acceso',
      'Soporte prioritario',
      'Capacitación personalizada',
    ],
  },
]
