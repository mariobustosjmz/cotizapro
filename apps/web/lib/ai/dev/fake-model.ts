import { z } from 'zod'

export const FAKE_TRIGGER_FAILURE = '[fallo-ia]'

export const fakeChatRequestSchema = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  stream: z.boolean().optional(),
  response_format: z.object({ type: z.string() }).optional(),
})

export type FakeChatRequest = z.infer<typeof fakeChatRequestSchema>
export type FakeReply = { readonly kind: 'fail' } | { readonly kind: 'json' | 'text'; readonly content: string }

export const FAKE_DRAFT = {
  cliente: { nombre: 'Laura Treviño', telefono: '81 2345 6789', correo: null, zona: 'San Nicolás' },
  partidas: [
    { concepto: 'Cancel de baño templado 9 mm', cantidad: 1, ancho: '90', alto: '1.80', notas: 'corredizo' },
    { concepto: 'Mosquitero de fibra', cantidad: 2, ancho: '120', alto: '150 cm', notas: null },
  ],
  notas: 'Quiere instalación el sábado',
} as const

export const FAKE_SHOWCASE = {
  headline: 'Cancelería y vidrio templado a la medida en Monterrey',
  bio: 'Fabricamos e instalamos canceles de baño, ventanas de aluminio y espejos a la medida. Tomamos medidas en tu domicilio y te entregamos una cotización clara.',
} as const

export const FAKE_TEXTS = {
  describe: '¡Claro! Aquí tienes una descripción mejorada:\n\nCancel de baño en vidrio templado de 9 mm con herrajes de acero inoxidable e instalación incluida.',
  followUp: 'Hola Laura, ¿pudiste revisar la cotización que te envié? Si tienes dudas sobre las medidas o el tipo de vidrio, con gusto te ayudo.',
  rewrite: 'Aquí tienes el texto revisado:\n\nEl anticipo del 50 % se paga al aceptar y el resto al terminar la instalación.',
  generic: 'Respuesta de prueba.',
} as const

export function fakeReply(request: Pick<FakeChatRequest, 'messages' | 'response_format'>): FakeReply {
  const system = request.messages.find((m) => m.role === 'system')?.content ?? ''
  const userText = request.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n')
  if (userText.includes(FAKE_TRIGGER_FAILURE)) return { kind: 'fail' }
  if (request.response_format?.type === 'json_object') {
    return { kind: 'json', content: JSON.stringify(system.includes('"partidas"') ? FAKE_DRAFT : FAKE_SHOWCASE) }
  }
  if (system.includes('descripción de una partida')) return { kind: 'text', content: FAKE_TEXTS.describe }
  if (system.includes('mensaje de seguimiento')) return { kind: 'text', content: FAKE_TEXTS.followUp }
  if (system.includes('Reescribe')) return { kind: 'text', content: FAKE_TEXTS.rewrite }
  return { kind: 'text', content: FAKE_TEXTS.generic }
}

export function fakeSseBody(content: string): string {
  const pieces = content.match(/[\s\S]{1,24}/g) ?? []
  const chunks = pieces.map((p) => `data: ${JSON.stringify({ choices: [{ delta: { content: p } }] })}\n\n`)
  const usage = `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 120, completion_tokens: pieces.length * 6 } })}\n\n`
  return [...chunks, usage, 'data: [DONE]\n\n'].join('')
}
