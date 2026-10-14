import type { AiMessage } from '../client'
import type { AiOrgInfo } from '../route-context'
import { baseSystem, chatMessages, wrapUserData } from './common'

export const SHOWCASE_SHAPE = '{"headline":"","bio":""}'

export interface ShowcaseFacts {
  readonly displayName: string
  readonly city: string | null
  readonly serviceArea: string | null
  readonly services: readonly string[]
  readonly currentHeadline: string | null
  readonly currentBio: string | null
}

const TASK = [
  'Propón los textos de la página pública del negocio.',
  '"headline" es una frase corta de máximo 90 caracteres que diga qué hace el negocio y dónde.',
  '"bio" es una descripción de 2 a 4 oraciones, máximo 600 caracteres, en primera persona del plural.',
  'Usa solo los datos que vienen en el dato.',
  `Responde solo con un objeto JSON con esta forma: ${SHOWCASE_SHAPE}`,
].join('\n')

export function showcaseTextsMessages(org: AiOrgInfo, facts: ShowcaseFacts): readonly AiMessage[] {
  const lines = [
    `Nombre: ${facts.displayName}`,
    facts.city ? `Ciudad: ${facts.city}` : null,
    facts.serviceArea ? `Zona de servicio: ${facts.serviceArea}` : null,
    facts.services.length > 0 ? `Servicios: ${facts.services.join(', ')}` : null,
    facts.currentHeadline ? `Frase actual: ${facts.currentHeadline}` : null,
    facts.currentBio ? `Descripción actual: ${facts.currentBio}` : null,
  ]
  return chatMessages(baseSystem(org, TASK), wrapUserData(lines.filter((line): line is string => line !== null).join('\n')))
}
