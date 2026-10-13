export interface ChecklistInput {
  readonly hasLogo: boolean
  readonly services: number
  readonly quotes: number
  readonly pagePublished: boolean
  readonly teammates: number
  readonly pendingInvites: number
  readonly includedUsers: number
}

export interface ChecklistStep {
  readonly id: 'brand' | 'catalog' | 'quote' | 'page' | 'team'
  readonly label: string
  readonly hint: string
  readonly href: string
  readonly done: boolean
}

/** Primeros pasos de una cuenta nueva; cada paso se marca solo a partir de los datos reales. */
export function buildChecklist(input: ChecklistInput): readonly ChecklistStep[] {
  const steps: ChecklistStep[] = [
    { id: 'brand', label: 'Sube tu logo y color', hint: 'Sale en tus PDF y tu página', href: '/dashboard/settings', done: input.hasLogo },
    { id: 'catalog', label: 'Arma tu catálogo', hint: 'Servicios y precios para cotizar rápido', href: '/dashboard/services', done: input.services > 0 },
    { id: 'quote', label: 'Haz tu primera cotización', hint: 'Mándala por WhatsApp en un minuto', href: '/dashboard/quotes/new', done: input.quotes > 0 },
    { id: 'page', label: 'Publica tu página', hint: 'Para que te pidan cotizaciones', href: '/dashboard/vitrina', done: input.pagePublished },
  ]
  if (input.includedUsers > 1) {
    steps.push({ id: 'team', label: 'Invita a tu equipo', hint: 'Comparte la liga por WhatsApp', href: '/dashboard/team/invite', done: input.teammates > 0 || input.pendingInvites > 0 })
  }
  return steps
}
