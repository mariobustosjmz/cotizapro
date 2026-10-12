'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Inbox, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { EmptyState } from '@/components/quote-requests/empty-state'
import { RequestCard } from '@/components/quote-requests/request-card'
import { StatusFilter } from '@/components/quote-requests/status-filter'
import { useQuoteRequests } from '@/components/quote-requests/use-quote-requests'
import type { QuoteRequestFilter } from '@/components/quote-requests/types'

export default function QuoteRequestsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [filter, setFilter] = useState<QuoteRequestFilter>('new')
  const notifyError = useCallback((message: string) => toast({ message, variant: 'error' }), [toast])
  const { requests, loading, error, pendingId, reload, setStatus, convert } = useQuoteRequests(filter, notifyError)

  async function handleConvert(id: string) {
    const clientId = await convert(id)
    if (!clientId) return
    toast({ message: 'Cliente listo. Arma la cotización.', variant: 'success' })
    router.push(`/dashboard/quotes/new?client_id=${clientId}`)
  }

  async function handleDiscard(id: string) {
    if (await setStatus(id, 'discarded')) toast({ message: 'Solicitud descartada', variant: 'success' })
  }

  async function handleRestore(id: string) {
    if (await setStatus(id, 'new')) toast({ message: 'Solicitud restaurada', variant: 'success' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Inbox className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Solicitudes</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pedidos de cotización desde tu página pública</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading} aria-label="Actualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <StatusFilter value={filter} onChange={setFilter} />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">Cargando...</div>
      ) : requests.length === 0 && !error ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              busy={pendingId === request.id}
              onConvert={(id) => void handleConvert(id)}
              onDiscard={(id) => void handleDiscard(id)}
              onRestore={(id) => void handleRestore(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
