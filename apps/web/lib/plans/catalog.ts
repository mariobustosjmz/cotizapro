import type { Plan, PlanId } from './types'

export const EXTRA_USER_MONTHLY_PRICE = 99
export const PRICES_INCLUDE_VAT = true
export const PLAN_ORDER: readonly PlanId[] = ['free', 'starter', 'pro', 'enterprise']

export const PLANS: Readonly<Record<PlanId, Plan>> = {
  free: {
    id: 'free',
    name: 'Gratis',
    tagline: 'Para probar sin riesgo',
    monthlyPrice: 0,
    includedUsers: 1,
    allowsExtraUsers: false,
    aiCreditsMonthly: 25,
    highlighted: false,
    features: [
      '5 cotizaciones al mes',
      'Cotización por medidas y PDF con tu logo',
      'Catálogo y listas de precios',
      'Envío por WhatsApp con un toque',
      'Página pública con QR',
      '25 créditos de IA al mes',
    ],
    upcoming: [],
  },
  starter: {
    id: 'starter',
    name: 'Solo',
    tagline: 'Para el técnico independiente',
    monthlyPrice: 399,
    includedUsers: 1,
    allowsExtraUsers: false,
    aiCreditsMonthly: 150,
    highlighted: false,
    features: [
      'Cotizaciones ilimitadas',
      'Envío por WhatsApp y correo con tu logo',
      'Clientes, agenda y recordatorios',
      'Registro de anticipos y saldos',
      'Liga para que tu cliente acepte y pague el anticipo',
      'Plantillas y analítica de ventas',
      'Reseñas verificadas y solicitudes desde tu página',
      '150 créditos de IA al mes',
    ],
    upcoming: ['Recordatorios automáticos por WhatsApp'],
  },
  pro: {
    id: 'pro',
    name: 'Taller',
    tagline: 'Para talleres con equipo',
    monthlyPrice: 999,
    includedUsers: 3,
    allowsExtraUsers: true,
    aiCreditsMonthly: 400,
    highlighted: true,
    features: [
      'Todo lo del plan Solo',
      'Equipo con roles: dirección, ventas e instalación',
      'Agenda con responsable por evento',
      'Fotos de obra antes y después',
      'Tablero de cotizaciones por etapa',
      '400 créditos de IA al mes',
    ],
    upcoming: [],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Empresa',
    tagline: 'Para empresas con varias cuadrillas',
    monthlyPrice: 1590,
    includedUsers: 10,
    allowsExtraUsers: true,
    aiCreditsMonthly: 1200,
    highlighted: false,
    features: [
      'Todo lo del plan Taller',
      'Usuarios suficientes para varias cuadrillas',
      'Acompañamiento para cargar catálogo y precios',
      '1,200 créditos de IA al mes',
    ],
    upcoming: ['Facturación CFDI 4.0', 'API de integración'],
  },
}

/** Funciones que aún no existen para ningún plan; se muestran como "Próximamente". */
export const UPCOMING_FEATURES: readonly string[] = [
  'Envío automático por WhatsApp (API oficial de Meta)',
  'Contratación y pago del plan con tarjeta',
  'Pago anual con descuento',
]

export function isPlanId(value: string): value is PlanId {
  return (PLAN_ORDER as readonly string[]).includes(value)
}
