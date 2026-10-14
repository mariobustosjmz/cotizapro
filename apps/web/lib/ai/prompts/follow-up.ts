import type { AiMessage } from '../client'
import { daysSinceSent } from '../follow-up/eligibility'
import type { FollowUpFacts } from '../follow-up/load-facts'
import type { AiOrgInfo } from '../route-context'
import { baseSystem, chatMessages, wrapUserData } from './common'

const TASK =
  'Escribe un mensaje de seguimiento por WhatsApp para un cliente que recibió una cotización y no ha respondido: máximo 3 oraciones, cordial, sin presionar, que invite a resolver dudas. No menciones montos, precios ni descuentos.'

export function followUpMessages(org: AiOrgInfo, facts: FollowUpFacts, now: Date): readonly AiMessage[] {
  const days = daysSinceSent(facts.sentAt, now) ?? 0
  const lines = [
    facts.clientName ? `Cliente: ${facts.clientName}` : null,
    `Cotización: ${facts.quoteNumber}`,
    `Enviada hace ${days} días${facts.status === 'viewed' ? ' y el cliente ya la abrió' : ''}`,
    facts.itemSummaries.length > 0 ? `Trabajo: ${facts.itemSummaries.join('; ')}` : null,
  ]
  return chatMessages(baseSystem(org, TASK), wrapUserData(lines.filter((l): l is string => l !== null).join('\n')))
}
