import type { DescribeItemInput } from '@/lib/validations/ai'
import type { AiMessage } from '../client'
import type { AiOrgInfo } from '../route-context'
import { baseSystem, chatMessages, wrapUserData } from './common'

const TASK =
  'Mejora la descripción de una partida de cotización: una sola oración de máximo 220 caracteres, concreta, con material, medida o alcance si vienen en el dato. No agregues datos que no estén en el dato.'

export function describeItemMessages(org: AiOrgInfo, input: DescribeItemInput): readonly AiMessage[] {
  const facts = [`Descripción actual: ${input.description}`, input.serviceName ? `Servicio del catálogo: ${input.serviceName}` : null]
  return chatMessages(baseSystem(org, TASK), wrapUserData(facts.filter((f): f is string => f !== null).join('\n')))
}
