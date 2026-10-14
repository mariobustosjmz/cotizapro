import { z } from 'zod'
import { MAX_CLIENT_OPTIONS } from './client-match'
import type { DraftResult } from './draft-result'

/** Igual que el tope de la extracción (extraction.ts); match.ts no se importa aquí porque arrastra el logger del servidor. */
const MAX_DRAFT_ITEMS = 15

const draftClientSchema = z.object({
  name: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  zone: z.string().nullable(),
})

const clientOptionSchema = z.object({ clientId: z.string().min(1), name: z.string() })

/** Debe aceptar exactamente cada variante de ClientMatch: si el navegador rechaza un borrador, el servidor ya cobró. */
const clientMatchSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('existing'), clientId: z.string().min(1), name: z.string(), matchedBy: z.enum(['phone', 'name']) }),
  z.object({ kind: z.literal('ambiguous'), client: draftClientSchema, candidates: z.array(clientOptionSchema).min(1).max(MAX_CLIENT_OPTIONS).readonly() }),
  z.object({ kind: z.literal('new'), client: draftClientSchema }),
  z.object({ kind: z.literal('none') }),
])

const draftItemSchema = z.object({
  concept: z.string(),
  quantity: z.number(),
  widthM: z.number().nullable(),
  heightM: z.number().nullable(),
  notes: z.string().nullable(),
  serviceId: z.string().nullable(),
  serviceName: z.string().nullable(),
})

/** Valida en el navegador la respuesta de /api/ai/whatsapp-draft. Sin campos de precio: Zod descarta llaves desconocidas. */
export const draftResultSchema = z.object({
  client: clientMatchSchema,
  items: z.array(draftItemSchema).max(MAX_DRAFT_ITEMS).readonly(),
  notes: z.string().nullable(),
  zone: z.string().nullable(),
}) satisfies z.ZodType<DraftResult>

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false

/** `satisfies` acepta un esquema más estrecho; esto falla al compilar si el tipo inferido deja de ser igual a DraftResult. */
export const DRAFT_RESULT_SCHEMA_IS_EXACT: Same<z.infer<typeof draftResultSchema>, DraftResult> = true
