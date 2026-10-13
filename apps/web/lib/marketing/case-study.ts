import type { ProjectionStat, UsageScenario } from './types'

/**
 * Cifras del caso simulado de presentación (scripts/seed/presentacion): un taller de vidrio con datos
 * ficticios durante 6 semanas. Si el caso cambia, estas cifras deben regenerarse desde su resumen.
 */
export const CASE_STUDY_STATS: readonly ProjectionStat[] = [
  { value: '6 de 10', label: 'cotizaciones ganadas' },
  { value: '$174 mil', label: 'en trabajos ganados' },
  { value: '$105 mil', label: 'cobrados y registrados' },
  { value: '6 semanas', label: 'de operación simulada' },
]

export const CASE_STUDY_NOTE =
  'Proyección de un caso de estudio simulado: taller de vidrio y aluminio en Monterrey, con clientes y montos ficticios durante 6 semanas. Es una estimación ilustrativa, no un resultado garantizado ni de clientes reales.'

export const USAGE_SCENARIOS: readonly UsageScenario[] = [
  {
    quote: 'Antes cada cotización se armaba en Word o en el cuaderno. Con el catálogo y las medidas, el PDF sale en minutos y se manda por WhatsApp desde la obra.',
    profile: 'Técnico independiente de aire acondicionado',
  },
  {
    quote: 'Cada anticipo y saldo queda anotado en su cotización, así se sabe cuánto falta por cobrar sin revisar libretas ni chats.',
    profile: 'Taller de vidrio con tres personas',
  },
  {
    quote: 'La página pública con trabajos terminados y reseñas verificadas ayuda a que un cliente nuevo confíe antes de pedir cotización.',
    profile: 'Electricista con cuadrilla',
  },
]

export const SCENARIOS_NOTE =
  'Escenarios ilustrativos construidos con el caso de estudio; no son opiniones de clientes reales.'
