import { z } from 'zod'

export const respondPublicQuoteSchema = z.object({
  action: z.enum(['accept', 'reject']),
  name: z.string().trim().max(120, 'Tu nombre puede tener hasta 120 caracteres').optional(),
  reason: z.string().trim().max(500, 'El motivo puede tener hasta 500 caracteres').optional(),
})

export type RespondPublicQuoteInput = z.infer<typeof respondPublicQuoteSchema>
