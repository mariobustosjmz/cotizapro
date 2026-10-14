import { z } from 'zod'
import type { DraftClient } from './types'

export interface DraftClientPayload {
  readonly name: string
  readonly phone: string | null
  readonly whatsapp_phone: string | null
  readonly email: string | null
  readonly address: string | null
}

export interface CreatedDraftClient {
  readonly id: string
  readonly name: string
}

const createdSchema = z.object({ client: z.object({ id: z.string(), name: z.string() }) })
const errorSchema = z.object({ error: z.string() })
const FALLBACK_ERROR = 'No se pudo crear el cliente'

/** La zona del mensaje va como dirección; el teléfono también como WhatsApp. */
export function draftClientPayload(client: DraftClient): DraftClientPayload {
  return { name: client.name ?? '', phone: client.phone, whatsapp_phone: client.phone, email: client.email, address: client.zone }
}

/** Se llama solo al guardar la cotización: el borrador nunca crea clientes por sí mismo. */
export async function createDraftClient(client: DraftClient, fetchImpl: typeof fetch = fetch): Promise<CreatedDraftClient> {
  if (!client.name) throw new Error('El cliente no tiene nombre')
  const res = await fetchImpl('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draftClientPayload(client)),
  })
  const body: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const parsed = errorSchema.safeParse(body)
    throw new Error(parsed.success ? parsed.data.error : FALLBACK_ERROR)
  }
  const created = createdSchema.safeParse(body)
  if (!created.success) throw new Error(FALLBACK_ERROR)
  return created.data.client
}
