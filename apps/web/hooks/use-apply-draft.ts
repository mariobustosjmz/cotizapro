'use client'

import { useEffect, useRef, useState } from 'react'
import type { PriceList } from '@cotizapro/quoting'
import { applyDraft, type ClientProposal, type DraftApplySummary } from '@/lib/ai/whatsapp/apply-draft'
import type { ClientOption } from '@/lib/ai/whatsapp/client-match'
import { createDraftClient } from '@/lib/ai/whatsapp/create-client'
import type { DraftResult } from '@/lib/ai/whatsapp/draft-result'
import type { CatalogService } from '@/lib/ai/whatsapp/to-form'
import type { DraftClient } from '@/lib/ai/whatsapp/types'
import type { QuoteFormItem } from '@/types/quote-form'

export interface UseApplyDraftArgs {
  readonly services: readonly CatalogService[]
  readonly priceLists: readonly PriceList[]
  readonly items: readonly QuoteFormItem[]
  readonly notes: string
  readonly selectedClientId: string
  readonly setItems: (update: (prev: readonly QuoteFormItem[]) => QuoteFormItem[]) => void
  readonly setNotes: (update: (prev: string) => string) => void
  /** Selecciona al cliente; si no estaba en la lista cargada, lo agrega con ese nombre. */
  readonly selectClient: (clientId: string, name: string) => void
  readonly clearClient: (searchText: string) => void
}

export interface ApplyDraftState {
  readonly proposal: ClientProposal | null
  readonly pendingClient: DraftClient | null
  readonly apply: (result: DraftResult) => DraftApplySummary
  readonly pickClient: (client: ClientOption) => void
  readonly createNewClient: (client: DraftClient) => void
  readonly dismiss: () => void
  /** La persona escribió en el buscador de clientes: deja de proponer el cliente del mensaje. */
  readonly reset: () => void
  /** Al guardar: el cliente elegido o, si el mensaje traía uno nuevo, lo crea en ese momento. */
  readonly resolveClientId: () => Promise<string | null>
}

export function useApplyDraft(args: UseApplyDraftArgs): ApplyDraftState {
  const [proposal, setProposal] = useState<ClientProposal | null>(null)
  const [pendingClient, setPendingClient] = useState<DraftClient | null>(null)
  // La IA tarda segundos: al aplicar se usan el formulario y el cliente vigentes, no los del clic.
  const latest = useRef(args)
  const pendingRef = useRef(pendingClient)
  useEffect(() => {
    latest.current = args
    pendingRef.current = pendingClient
  })

  function pickClient(client: ClientOption): void {
    setPendingClient(null)
    latest.current.selectClient(client.clientId, client.name)
    setProposal((prev) => (prev?.kind === 'found' && prev.clientId === client.clientId ? { ...prev, applied: true } : null))
  }

  function createNewClient(client: DraftClient): void {
    setPendingClient(client)
    latest.current.clearClient(client.name ?? '')
    setProposal(null)
  }

  function apply(result: DraftResult): DraftApplySummary {
    return applyDraft(result, {
      services: latest.current.services,
      priceLists: latest.current.priceLists,
      currentItems: latest.current.items,
      currentNotes: latest.current.notes,
      selectedClientId: latest.current.selectedClientId,
      pendingClient: pendingRef.current,
      setItems: latest.current.setItems,
      setNotes: latest.current.setNotes,
      onExistingClient: pickClient,
      onNewClient: createNewClient,
      onProposal: setProposal,
    })
  }

  function reset(): void {
    setPendingClient(null)
    setProposal(null)
  }

  async function resolveClientId(): Promise<string | null> {
    if (latest.current.selectedClientId) return latest.current.selectedClientId
    if (!pendingClient) return null
    const created = await createDraftClient(pendingClient)
    latest.current.selectClient(created.id, created.name)
    setPendingClient(null)
    return created.id
  }

  return { proposal, pendingClient, apply, pickClient, createNewClient, dismiss: () => setProposal(null), reset, resolveClientId }
}
