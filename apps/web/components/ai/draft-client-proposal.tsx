'use client'

import { X } from 'lucide-react'
import { foundClientLabel, type ClientProposal } from '@/lib/ai/whatsapp/apply-draft'
import type { ClientOption } from '@/lib/ai/whatsapp/client-match'
import type { DraftClient } from '@/lib/ai/whatsapp/types'

interface DraftClientProposalProps {
  readonly proposal: ClientProposal | null
  readonly pendingClient: DraftClient | null
  readonly selectedClientId: string
  readonly onPick: (client: ClientOption) => void
  readonly onCreateNew: (client: DraftClient) => void
  readonly onDismiss: () => void
}

const ACTION = 'rounded-md border border-orange-200 dark:border-orange-800 px-2 py-0.5 text-[11px] text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer'

function pendingDetails(client: DraftClient): string {
  return [client.phone, client.email, client.zone].filter((v): v is string => Boolean(v)).join(' · ')
}

function CreateNewButton({ client, onCreateNew }: { readonly client: DraftClient; readonly onCreateNew: (client: DraftClient) => void }) {
  if (!client.name) return null
  return (
    <button type="button" onClick={() => onCreateNew(client)} className={ACTION} data-testid="draft-client-create">
      Crear cliente nuevo: {client.name}
    </button>
  )
}

function ProposalBody({ proposal, selectedClientId, onPick, onCreateNew }: Omit<DraftClientProposalProps, 'pendingClient' | 'onDismiss'> & { readonly proposal: ClientProposal }) {
  if (proposal.kind === 'found') {
    return (
      <div className="flex flex-wrap items-center gap-2" data-testid="draft-client-found">
        <span>{foundClientLabel(proposal.matchedBy, proposal.name)}</span>
        {selectedClientId !== proposal.clientId && (
          <button type="button" onClick={() => onPick({ clientId: proposal.clientId, name: proposal.name })} className={ACTION} data-testid="draft-client-use">
            Usar este cliente
          </button>
        )}
      </div>
    )
  }
  if (proposal.kind === 'new') {
    return (
      <div className="flex flex-wrap items-center gap-2" data-testid="draft-client-new">
        <span>El mensaje es de un cliente nuevo.</span>
        <CreateNewButton client={proposal.client} onCreateNew={onCreateNew} />
      </div>
    )
  }
  return (
    <div className="space-y-1.5" data-testid="draft-client-choose">
      <p>El mensaje coincide con clientes que ya tienes. Elige uno o crea uno nuevo:</p>
      <div className="flex flex-wrap gap-1.5">
        {proposal.candidates.map((candidate, index) => (
          <button key={candidate.clientId} type="button" onClick={() => onPick(candidate)} className={ACTION} data-testid={`draft-client-candidate-${index}`}>
            {candidate.name}
          </button>
        ))}
        <CreateNewButton client={proposal.client} onCreateNew={onCreateNew} />
      </div>
    </div>
  )
}

/** Cliente que trae el mensaje: se propone, nunca se crea ni reemplaza solo. */
export function DraftClientProposal(props: DraftClientProposalProps) {
  const { proposal, pendingClient, selectedClientId, onDismiss } = props
  const pending = pendingClient && !selectedClientId ? pendingClient : null
  const visible = proposal !== null && !(proposal.kind === 'new' && proposal.applied) ? proposal : null
  if (!pending && !visible) return null
  return (
    <div className="mt-1.5 flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400">
      <div className="min-w-0 flex-1 space-y-1">
        {pending && (
          <p data-testid="pending-client-hint">
            Se creará el cliente &quot;{pending.name}&quot; al guardar.
            {pendingDetails(pending) && <span className="block text-gray-500 dark:text-gray-400">{pendingDetails(pending)}</span>}
          </p>
        )}
        {visible && <ProposalBody {...props} proposal={visible} />}
      </div>
      {visible && (
        <button type="button" onClick={onDismiss} aria-label="Ocultar sugerencia de cliente" className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer" data-testid="draft-client-dismiss">
          <X className="w-3 h-3" aria-hidden />
        </button>
      )}
    </div>
  )
}
