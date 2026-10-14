import type { PriceList } from '@cotizapro/quoting'
import type { QuoteFormItem } from '@/types/quote-form'
import type { ClientMatch, ClientMatchedBy, ClientOption } from './client-match'
import type { DraftResult } from './draft-result'
import { draftToFormPatch, mergeDraftItems, mergeNotes, type CatalogService } from './to-form'
import type { DraftClient } from './types'

/** Qué se le muestra a la persona sobre el cliente del mensaje. `applied` es false si ya había elegido otro cliente. */
export type ClientProposal =
  | { readonly kind: 'found'; readonly clientId: string; readonly name: string; readonly matchedBy: ClientMatchedBy; readonly applied: boolean }
  | { readonly kind: 'choose'; readonly client: DraftClient; readonly candidates: readonly ClientOption[] }
  | { readonly kind: 'new'; readonly client: DraftClient; readonly applied: boolean }

export interface DraftApplySummary {
  readonly added: number
  readonly kept: number
  readonly notesTruncated: boolean
}

export interface ApplyDraftDeps {
  readonly services: readonly CatalogService[]
  readonly priceLists: readonly PriceList[]
  readonly currentItems: readonly QuoteFormItem[]
  readonly currentNotes: string
  readonly selectedClientId: string
  /** Cliente nuevo del mensaje anterior que se creará al guardar: cuenta como cliente elegido. */
  readonly pendingClient: DraftClient | null
  readonly setItems: (update: (prev: readonly QuoteFormItem[]) => QuoteFormItem[]) => void
  readonly setNotes: (update: (prev: string) => string) => void
  readonly onExistingClient: (client: ClientOption) => void
  readonly onNewClient: (client: DraftClient) => void
  readonly onProposal: (proposal: ClientProposal) => void
}

/** Igual que notes en createQuoteSchema. */
export const QUOTE_NOTES_MAX = 2000

const MATCHED_BY_LABEL: Readonly<Record<ClientMatchedBy, string>> = { phone: 'teléfono', name: 'nombre' }

export function foundClientLabel(matchedBy: ClientMatchedBy, name: string): string {
  return `Cliente encontrado por ${MATCHED_BY_LABEL[matchedBy]}: ${name}`
}

const sameDraftClient = (a: DraftClient, b: DraftClient): boolean =>
  a.name === b.name && a.phone === b.phone && a.email === b.email && a.zone === b.zone

/** Nunca reemplaza al cliente que la persona ya eligió (ni al nuevo pendiente); ante la duda (ambiguo) decide ella. */
export function clientProposal(match: ClientMatch, selectedClientId: string, pendingClient: DraftClient | null): ClientProposal | null {
  const free = !selectedClientId && !pendingClient
  switch (match.kind) {
    case 'existing': {
      const applied = free || selectedClientId === match.clientId
      return { kind: 'found', clientId: match.clientId, name: match.name, matchedBy: match.matchedBy, applied }
    }
    case 'ambiguous':
      return { kind: 'choose', client: match.client, candidates: match.candidates }
    case 'new':
      return { kind: 'new', client: match.client, applied: free || (!selectedClientId && pendingClient !== null && sameDraftClient(pendingClient, match.client)) }
    case 'none':
      return null
  }
}

/** Corta el final (lo que agregó el borrador) sin partir un par sustituto. */
export function capNotes(notes: string): string {
  if (notes.length <= QUOTE_NOTES_MAX) return notes
  const code = notes.charCodeAt(QUOTE_NOTES_MAX - 1)
  const end = code >= 0xd800 && code <= 0xdbff ? QUOTE_NOTES_MAX - 1 : QUOTE_NOTES_MAX
  return notes.slice(0, end)
}

const isFilled = (item: QuoteFormItem): boolean => Boolean(item.description.trim() || item.service_id)

/** Agrega al final: las partidas y notas que ya capturó la persona se conservan. Nada se guarda en la base. */
export function applyDraft(result: DraftResult, deps: ApplyDraftDeps): DraftApplySummary {
  const patch = draftToFormPatch(result, deps.services, deps.priceLists)
  deps.setItems((prev) => [...mergeDraftItems(prev, patch.items)])
  deps.setNotes((prev) => capNotes(mergeNotes(prev, patch.notes)))
  const proposal = clientProposal(result.client, deps.selectedClientId, deps.pendingClient)
  if (proposal?.kind === 'found' && proposal.applied) deps.onExistingClient({ clientId: proposal.clientId, name: proposal.name })
  if (proposal?.kind === 'new' && proposal.applied) deps.onNewClient(proposal.client)
  if (proposal) deps.onProposal(proposal)
  const notesTruncated = mergeNotes(deps.currentNotes, patch.notes).length > QUOTE_NOTES_MAX
  return { added: patch.items.length, kept: deps.currentItems.filter(isFilled).length, notesTruncated }
}

function addedText(added: number): string {
  return added === 1 ? 'Se agregó 1 partida' : `Se agregaron ${added} partidas`
}

function keptText(kept: number): string {
  return kept === 1 ? 'se conservó la que ya tenías' : `se conservaron las ${kept} que ya tenías`
}

function itemsText({ added, kept }: DraftApplySummary): string {
  if (added === 0) return 'El mensaje no trae partidas reconocibles; tus partidas quedan igual.'
  return kept > 0 ? `${addedText(added)} al final; ${keptText(kept)}.` : `${addedText(added)}.`
}

export function draftSummaryText(summary: DraftApplySummary): string {
  const notes = summary.notesTruncated ? ' Las notas pasaban de 2,000 caracteres: se recortó el final.' : ''
  return `${itemsText(summary)}${notes}`
}
