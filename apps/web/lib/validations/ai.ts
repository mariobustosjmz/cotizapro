import { z } from 'zod'

export const describeItemSchema = z.object({
  description: z.string({ error: 'Escribe la descripción' }).trim().min(3, 'Escribe al menos 3 letras').max(300, 'Máximo 300 caracteres'),
  serviceName: z.string({ error: 'Servicio no válido' }).trim().max(200, 'Máximo 200 caracteres').nullish(),
})

export const REWRITE_MODES = ['polish', 'shorter', 'formal', 'english'] as const
export const REWRITE_CONTEXTS = ['quote_notes', 'quote_terms', 'review_reply', 'free'] as const

export const rewriteSchema = z.object({
  text: z.string({ error: 'Escribe el texto' }).trim().min(3, 'Escribe al menos 3 letras').max(2000, 'Máximo 2,000 caracteres'),
  mode: z.enum(REWRITE_MODES, { error: 'Elige cómo mejorar el texto' }),
  context: z.enum(REWRITE_CONTEXTS, { error: 'Contexto no válido' }),
})

export const followUpSchema = z.object({ quoteId: z.guid({ error: 'Cotización no válida' }) })

export const whatsappDraftSchema = z.object({
  message: z.string({ error: 'Pega el mensaje del cliente' }).trim().min(10, 'Pega el mensaje completo del cliente').max(4000, 'Máximo 4,000 caracteres'),
})

export const adminGrantSchema = z.object({
  organizationId: z.guid({ error: 'Empresa no válida' }),
  credits: z
    .number({ error: 'Los créditos deben ser un número' })
    .int('Los créditos deben ser un número entero')
    .min(1, 'Los créditos deben ser entre 1 y 100,000')
    .max(100000, 'Los créditos deben ser entre 1 y 100,000'),
  source: z.enum(['pack', 'courtesy'], { error: 'Elige el origen: paquete o cortesía' }),
  reference: z.string({ error: 'Referencia no válida' }).trim().max(200, 'La referencia admite máximo 200 caracteres').optional(),
})

export type DescribeItemInput = z.infer<typeof describeItemSchema>
export type RewriteInput = z.infer<typeof rewriteSchema>
export type RewriteMode = (typeof REWRITE_MODES)[number]
export type RewriteContext = (typeof REWRITE_CONTEXTS)[number]
export type FollowUpInput = z.infer<typeof followUpSchema>
export type WhatsappDraftInput = z.infer<typeof whatsappDraftSchema>
export type AdminGrantInput = z.infer<typeof adminGrantSchema>
