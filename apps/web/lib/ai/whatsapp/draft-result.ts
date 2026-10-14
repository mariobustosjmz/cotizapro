import { z } from 'zod'
import type { MemberContext } from '@/lib/auth/require-member'
import { logger } from '@/lib/logger'
import { matchClient, type ClientCandidate, type ClientMatch } from './client-match'
import { matchServiceIds } from './match'
import type { DraftExtraction, DraftItem } from './types'

export interface DraftResultItem extends DraftItem {
  readonly serviceId: string | null
  readonly serviceName: string | null
}

export interface DraftResult {
  readonly client: ClientMatch
  readonly items: readonly DraftResultItem[]
  readonly notes: string | null
  readonly zone: string | null
}

/** Cliente con RLS de la persona: solo lee. Este módulo nunca inserta clientes ni cotizaciones. */
export type DraftDb = Pick<MemberContext['supabase'], 'from' | 'rpc'>

/** Los teléfonos se guardan con formatos libres, así que no se pueden filtrar en SQL; se comparan aquí sobre los más recientes. */
const MAX_CLIENTS_SCANNED = 500

const clientRowSchema = z.object({ id: z.guid(), name: z.string(), phone: z.string().nullable(), whatsapp_phone: z.string().nullable() })

function parseClients(data: unknown): readonly ClientCandidate[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((row: unknown) => {
    const parsed = clientRowSchema.safeParse(row)
    return parsed.success ? [parsed.data] : []
  })
}

async function loadClients(db: DraftDb, organizationId: string): Promise<readonly ClientCandidate[]> {
  try {
    const { data, error } = await db
      .from('clients')
      .select('id, name, phone, whatsapp_phone')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(MAX_CLIENTS_SCANNED)
    if (error) logger.warn('draft clients lookup failed', { organizationId, reason: error.message })
    return parseClients(data)
  } catch (error) {
    logger.warn('draft clients lookup threw', { organizationId, reason: error instanceof Error ? error.name : 'unknown' })
    return []
  }
}

/** Corre después del cobro y nunca lanza: si una búsqueda falla, el borrador sale sin liga al catálogo o con cliente nuevo. */
export async function buildDraftResult(db: DraftDb, organizationId: string, extraction: DraftExtraction): Promise<DraftResult> {
  const { name, phone } = extraction.client
  const [matches, clients] = await Promise.all([
    matchServiceIds(db, extraction.items.map((item) => item.concept)),
    name || phone ? loadClients(db, organizationId) : Promise.resolve<readonly ClientCandidate[]>([]),
  ])
  return {
    client: matchClient(extraction.client, clients),
    items: extraction.items.map((item, index) => ({
      ...item,
      serviceId: matches[index]?.serviceId ?? null,
      serviceName: matches[index]?.serviceName ?? null,
    })),
    notes: extraction.notes,
    zone: extraction.client.zone,
  }
}
