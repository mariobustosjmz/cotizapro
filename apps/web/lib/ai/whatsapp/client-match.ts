import { phoneKey } from '@/lib/showcase/phone-match'
import { normalizeForMatch } from './normalize'
import type { DraftClient } from './types'

export interface ClientCandidate {
  readonly id: string
  readonly name: string
  readonly phone: string | null
  readonly whatsapp_phone: string | null
}

export interface ClientOption {
  readonly clientId: string
  readonly name: string
}

export type ClientMatchedBy = 'phone' | 'name'

export type ClientMatch =
  | { readonly kind: 'existing'; readonly clientId: string; readonly name: string; readonly matchedBy: ClientMatchedBy }
  | { readonly kind: 'ambiguous'; readonly client: DraftClient; readonly candidates: readonly ClientOption[] }
  | { readonly kind: 'new'; readonly client: DraftClient }
  | { readonly kind: 'none' }

export const MAX_CLIENT_OPTIONS = 5
const NATIONAL_PHONE = /^[0-9]{10}$/
const MIN_WORDS_FOR_NAME_LINK = 2
/** Partículas de apellidos: "María de la Garza" y "Pedro de la Fuente" no comparten una palabra que identifique. */
const NAME_PARTICLES: ReadonlySet<string> = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'da', 'di', 'van', 'von'])

function nameWords(name: string | null): readonly string[] {
  return name ? normalizeForMatch(name).split(' ').filter((word) => word !== '' && !NAME_PARTICLES.has(word)) : []
}

function sameName(a: string, b: string | null): boolean {
  const key = b ? normalizeForMatch(b) : ''
  return key !== '' && normalizeForMatch(a) === key
}

function existing(client: ClientCandidate, matchedBy: ClientMatchedBy): ClientMatch {
  return { kind: 'existing', clientId: client.id, name: client.name, matchedBy }
}

function ambiguous(draft: DraftClient, found: readonly ClientCandidate[]): ClientMatch {
  const candidates = found.slice(0, MAX_CLIENT_OPTIONS).map((c) => ({ clientId: c.id, name: c.name }))
  return { kind: 'ambiguous', client: draft, candidates }
}

function byPhone(phone: string | null, clients: readonly ClientCandidate[]): readonly ClientCandidate[] {
  if (!phone || !NATIONAL_PHONE.test(phone)) return []
  return clients.filter((c) => phoneKey(c.phone) === phone || phoneKey(c.whatsapp_phone) === phone)
}

/** Un teléfono compartido se liga solo si exactamente uno tiene el mismo nombre; uno solo, si el nombre no lo contradice. */
function matchByPhone(draft: DraftClient, clients: readonly ClientCandidate[]): ClientMatch | null {
  const found = byPhone(draft.phone, clients)
  const [first] = found
  if (!first) return null
  if (found.length > 1) {
    const [exact, ...others] = found.filter((c) => sameName(c.name, draft.name))
    return exact && others.length === 0 ? existing(exact, 'phone') : ambiguous(draft, found)
  }
  const words = nameWords(draft.name)
  const clientWords = new Set(nameWords(first.name))
  const contradicts = words.length > 0 && !words.some((word) => clientWords.has(word))
  return contradicts ? ambiguous(draft, found) : existing(first, 'phone')
}

/** Por nombre solo se liga con nombre y apellido; con una sola palabra lo confirma el dueño. */
function matchByName(draft: DraftClient, clients: readonly ClientCandidate[]): ClientMatch | null {
  const found = clients.filter((c) => sameName(c.name, draft.name))
  const [first] = found
  if (!first) return null
  const linkable = found.length === 1 && nameWords(draft.name).length >= MIN_WORDS_FOR_NAME_LINK
  return linkable ? existing(first, 'name') : ambiguous(draft, found)
}

/** Teléfono (solo 10 dígitos) → nombre exacto → nuevo → ninguno. Ante la duda regresa 'ambiguous' y decide el dueño. */
export function matchClient(draft: DraftClient, clients: readonly ClientCandidate[]): ClientMatch {
  const matched = matchByPhone(draft, clients) ?? matchByName(draft, clients)
  if (matched) return matched
  if (draft.name) return { kind: 'new', client: draft }
  return { kind: 'none' }
}
