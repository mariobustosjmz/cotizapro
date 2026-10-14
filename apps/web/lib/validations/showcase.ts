import { z } from 'zod'

const phone = z
  .string()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(z.string().min(10, 'Teléfono de 10 dígitos').max(15, 'Teléfono demasiado largo'))

export const quoteRequestSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
  name: z.string().trim().min(2, 'Escribe tu nombre').max(100),
  phone,
  email: z.string().trim().email('Correo inválido').max(160).optional().or(z.literal('')),
  message: z.string().trim().min(5, 'Cuéntanos qué necesitas').max(2000),
  measurements: z.string().trim().max(300).optional(),
  website: z.string().max(500).optional(),
})

export const submitReviewSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{48}$/, 'Liga inválida'),
  rating: z.number().int().min(1, 'Elige una calificación').max(5),
  comment: z.string().trim().max(1000).optional(),
})

export const publicProfileUpdateSchema = z.object({
  display_name: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80),
  headline: z.string().trim().max(120).optional().nullable(),
  bio: z.string().trim().max(1500).optional().nullable(),
  service_area: z.string().trim().max(160).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  whatsapp_phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().regex(/^[0-9]{10,15}$/, 'WhatsApp de 10 a 15 dígitos'))
    .optional()
    .nullable()
    .or(z.literal('')),
  contact_email: z.string().trim().email('Correo inválido').max(160).optional().nullable().or(z.literal('')),
  is_published: z.boolean(),
  show_prices: z.boolean(),
})

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>
export type PublicProfileUpdateInput = z.infer<typeof publicProfileUpdateSchema>

export const REVIEW_REPLY_MAX = 1000

export const reviewReplySchema = z.object({
  owner_reply: z.string({ error: 'Escribe tu respuesta' }).trim().max(REVIEW_REPLY_MAX, 'Máximo 1,000 caracteres'),
})
