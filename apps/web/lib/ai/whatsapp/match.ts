import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { AiDb } from '../usage'
import { normalizeForMatch } from './normalize'

export { normalizeForMatch }

/** Igual que el tope de ai_match_services (p_terms[1:15]); el largo evita mandar frases enteras a pg_trgm. */
export const MATCH_MAX_TERMS = 15
export const MATCH_MAX_TERM_CHARS = 60

export interface CatalogCandidate {
  readonly termIndex: number
  readonly serviceId: string
  readonly serviceName: string
  readonly score: number
}

const rowSchema = z.object({ term_index: z.number().int(), service_id: z.guid(), service_name: z.string(), score: z.number() })

export function parseCandidates(data: unknown): readonly CatalogCandidate[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((row): CatalogCandidate[] => {
    const parsed = rowSchema.safeParse(row)
    if (!parsed.success) return []
    const { term_index, service_id, service_name, score } = parsed.data
    return [{ termIndex: term_index, serviceId: service_id, serviceName: service_name, score }]
  })
}

function rank(concept: string, candidate: CatalogCandidate): number {
  const name = normalizeForMatch(candidate.serviceName)
  if (name === concept) return 2
  if (name && (concept.includes(name) || name.includes(concept))) return 1
  return 0
}

export function chooseCatalogMatch(concept: string, candidates: readonly CatalogCandidate[]): CatalogCandidate | null {
  const normalized = normalizeForMatch(concept)
  const sorted = [...candidates].sort((a, b) => rank(normalized, b) - rank(normalized, a) || b.score - a.score)
  return sorted[0] ?? null
}

function toTerm(concept: string): string {
  return Array.from(concept).slice(0, MATCH_MAX_TERM_CHARS).join('').trim()
}

async function fetchCandidates(db: AiDb, terms: readonly string[]): Promise<readonly CatalogCandidate[] | null> {
  try {
    const { data, error } = await db.rpc('ai_match_services', { p_terms: terms })
    if (!error) return parseCandidates(data)
    logger.warn('ai_match_services failed', { reason: error.message })
  } catch (error) {
    logger.warn('ai_match_services threw', { reason: error instanceof Error ? error.name : 'unknown' })
  }
  return null
}

/** Una sola llamada para todas las partidas (sin N+1). Nunca lanza: si falla, las partidas quedan sin coincidencia. */
export async function matchServiceIds(db: AiDb, concepts: readonly string[]): Promise<readonly (CatalogCandidate | null)[]> {
  if (concepts.length === 0) return []
  const candidates = await fetchCandidates(db, concepts.slice(0, MATCH_MAX_TERMS).map(toTerm))
  if (!candidates) return concepts.map(() => null)
  return concepts.map((concept, index) => chooseCatalogMatch(concept, candidates.filter((c) => c.termIndex === index)))
}
