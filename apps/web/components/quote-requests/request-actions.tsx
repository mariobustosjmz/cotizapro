'use client'

import Link from 'next/link'
import { ArrowRight, MessageCircle, RotateCcw, UserRound, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { whatsappUrl } from './format'
import type { QuoteRequest } from './types'

interface RequestActionsProps {
  readonly request: QuoteRequest
  readonly busy: boolean
  readonly onConvert: (id: string) => void
  readonly onDiscard: (id: string) => void
  readonly onRestore: (id: string) => void
}

const PRIMARY = 'bg-orange-500 hover:bg-orange-600 text-white'

function ConvertedActions({ clientId }: { readonly clientId: string }) {
  return (
    <>
      <Button asChild size="sm" variant="outline">
        <Link href={`/dashboard/clients/${clientId}`}>
          <UserRound className="w-3.5 h-3.5" />
          Ver cliente
        </Link>
      </Button>
      <Button asChild size="sm" className={PRIMARY}>
        <Link href={`/dashboard/quotes/new?client_id=${clientId}`}>
          Nueva cotización
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </Button>
    </>
  )
}

export function RequestActions({ request, busy, onConvert, onDiscard, onRestore }: RequestActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <a href={whatsappUrl(request.phone, request.name)} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="w-3.5 h-3.5 text-green-600" />
          WhatsApp
        </a>
      </Button>
      {request.status === 'new' && (
        <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onDiscard(request.id)}>
            <XCircle className="w-3.5 h-3.5" />
            Descartar
          </Button>
          <Button size="sm" className={PRIMARY} disabled={busy} onClick={() => onConvert(request.id)}>
            {busy ? 'Convirtiendo...' : 'Convertir en cotización'}
            {!busy && <ArrowRight className="w-3.5 h-3.5" />}
          </Button>
        </>
      )}
      {request.status === 'discarded' && (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onRestore(request.id)}>
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar
        </Button>
      )}
      {request.status === 'converted' && request.client_id && <ConvertedActions clientId={request.client_id} />}
    </div>
  )
}
