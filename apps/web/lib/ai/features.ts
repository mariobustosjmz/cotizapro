export type AiFeatureId = 'whatsapp_draft' | 'describe_item' | 'follow_up' | 'rewrite' | 'showcase_texts'
export type AiOutputKind = 'json' | 'text'

export interface AiFeature {
  readonly id: AiFeatureId
  readonly credits: number
  readonly label: string
  readonly description: string
  readonly output: AiOutputKind
  readonly temperature: number
  readonly maxTokens: number
  readonly maxOutputChars: number
}

export const AI_DAILY_USER_CAP = 40

export const AI_FEATURE_ORDER: readonly AiFeatureId[] = ['whatsapp_draft', 'describe_item', 'follow_up', 'rewrite', 'showcase_texts']

export const AI_FEATURES: Readonly<Record<AiFeatureId, AiFeature>> = {
  whatsapp_draft: {
    id: 'whatsapp_draft',
    credits: 3,
    label: 'WhatsApp a borrador',
    description: 'Convierte el mensaje del cliente en un borrador de cotización.',
    output: 'json',
    temperature: 0.2,
    maxTokens: 700,
    maxOutputChars: 4000,
  },
  describe_item: {
    id: 'describe_item',
    credits: 2,
    label: 'Descripción con IA',
    description: 'Mejora la descripción de una partida.',
    output: 'text',
    temperature: 0.5,
    maxTokens: 160,
    maxOutputChars: 300,
  },
  follow_up: {
    id: 'follow_up',
    credits: 1,
    label: 'Seguimiento',
    description: 'Escribe un mensaje para dar seguimiento a una cotización enviada.',
    output: 'text',
    temperature: 0.5,
    maxTokens: 300,
    maxOutputChars: 600,
  },
  rewrite: {
    id: 'rewrite',
    credits: 1,
    label: 'Reescribir',
    description: 'Pule, acorta, formaliza o traduce un texto.',
    output: 'text',
    temperature: 0.5,
    maxTokens: 900,
    maxOutputChars: 2400,
  },
  showcase_texts: {
    id: 'showcase_texts',
    credits: 2,
    label: 'Textos de la vitrina',
    description: 'Propone la frase corta y la descripción de tu página.',
    output: 'json',
    temperature: 0.5,
    maxTokens: 450,
    maxOutputChars: 700,
  },
}

export function isAiFeatureId(value: string): value is AiFeatureId {
  return (AI_FEATURE_ORDER as readonly string[]).includes(value)
}

export function creditsLabel(credits: number): string {
  return credits === 1 ? '1 crédito' : `${credits.toLocaleString('es-MX')} créditos`
}
