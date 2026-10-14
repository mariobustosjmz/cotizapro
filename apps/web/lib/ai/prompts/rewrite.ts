import type { RewriteContext, RewriteInput, RewriteMode } from '@/lib/validations/ai'
import type { AiMessage } from '../client'
import type { AiOrgInfo } from '../route-context'
import { REWRITE_MODE_LABELS } from '../rewrite-labels'
import { baseSystem, chatMessages, wrapUserData } from './common'

const MODE_TASK: Readonly<Record<RewriteMode, string>> = {
  polish: 'Reescribe el texto para que se lea claro y correcto, corrigiendo ortografía y puntuación, sin cambiar lo que dice.',
  shorter: 'Reescribe el texto más corto, conservando toda la información importante.',
  formal: 'Reescribe el texto con un tono formal y profesional, sin cambiar lo que dice.',
  english: 'Reescribe el texto en inglés, conservando el sentido y los datos.',
}

const CONTEXT_HINT: Readonly<Record<RewriteContext, string>> = {
  quote_notes: 'Es la sección de notas de una cotización para un cliente.',
  quote_terms: 'Son los términos y condiciones de una cotización; conserva porcentajes, plazos y garantías tal como vienen.',
  review_reply: 'Es la respuesta pública del negocio a la reseña de un cliente; debe ser breve y agradecida, de máximo 900 caracteres.',
  free: 'Es un texto del negocio.',
}

export { REWRITE_MODE_LABELS }

export function rewriteMessages(org: AiOrgInfo, input: RewriteInput): readonly AiMessage[] {
  const task = `${MODE_TASK[input.mode]} ${CONTEXT_HINT[input.context]} Conserva cualquier cifra exactamente como viene.`
  return chatMessages(baseSystem(org, task, input.mode === 'english' ? 'en' : 'same'), wrapUserData(input.text))
}
