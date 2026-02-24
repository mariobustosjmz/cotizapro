'use client'

import { useState, useCallback } from 'react'
import { QuoteStatus } from '@/lib/validations/cotizapro'

interface KanbanQuote {
  id: string
  quote_number: string
  clients: { name: string | null; company_name: string | null } | null
  total_amount: number
  status: QuoteStatus
  updated_at: string
  has_pending_balance?: boolean
}

const KANBAN_COLUMNS: { key: QuoteStatus; label: string }[] = [
  { key: 'draft', label: 'Borrador' },
  { key: 'sent', label: 'Enviadas' },
  { key: 'viewed', label: 'Vistas' },
  { key: 'accepted', label: 'Aceptadas' },
  { key: 'en_instalacion', label: 'En Instalación' },
  { key: 'completado', label: 'Completadas' },
  { key: 'cobrado', label: 'Cobradas' },
]

const COLLAPSED_COLUMNS: { key: QuoteStatus; label: string }[] = [
  { key: 'rejected', label: 'Rechazadas' },
  { key: 'expired', label: 'Expiradas' },
]

// Forward transitions allowed freely; backward requires confirmation
function isBackwardMove(from: QuoteStatus, to: QuoteStatus): boolean {
  const order = KANBAN_COLUMNS.map(c => c.key)
  return order.indexOf(to) < order.indexOf(from)
}

interface Props {
  quotes: KanbanQuote[]
  onStatusChange: (quoteId: string, newStatus: QuoteStatus) => Promise<void>
}

export function QuotesKanban({ quotes, onStatusChange }: Props) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [confirmMove, setConfirmMove] = useState<{
    quoteId: string
    from: QuoteStatus
    to: QuoteStatus
  } | null>(null)

  const handleDragStart = useCallback((quoteId: string) => {
    setDragging(quoteId)
  }, [])

  const handleDrop = useCallback(
    async (targetStatus: QuoteStatus) => {
      if (!dragging) return
      const quote = quotes.find(q => q.id === dragging)
      if (!quote || quote.status === targetStatus) {
        setDragging(null)
        return
      }
      if (isBackwardMove(quote.status, targetStatus)) {
        setConfirmMove({ quoteId: dragging, from: quote.status, to: targetStatus })
        setDragging(null)
        return
      }
      setDragging(null)
      try {
        await onStatusChange(dragging, targetStatus)
      } catch (error) {
        console.error('Failed to update quote status:', error)
      }
    },
    [dragging, quotes, onStatusChange]
  )

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    return Math.floor(diff / 86400000)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map(col => {
        const colQuotes = quotes.filter(q => q.status === col.key)
        return (
          <div
            key={col.key}
            className="flex-shrink-0 w-64 bg-gray-50 rounded-lg p-3"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(col.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{col.label}</h3>
              <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
                {colQuotes.length}
              </span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {colQuotes.map(quote => (
                <div
                  key={quote.id}
                  draggable
                  onDragStart={() => handleDragStart(quote.id)}
                  className="bg-white rounded-md p-3 shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                >
                  <div className="text-xs font-mono text-gray-400 mb-1">
                    #{quote.quote_number}
                  </div>
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {quote.clients?.company_name ?? quote.clients?.name ?? '—'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-semibold text-gray-900">
                      ${Number(quote.total_amount).toLocaleString('es-MX')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {daysSince(quote.updated_at)}d
                    </span>
                  </div>
                  {quote.has_pending_balance && (
                    <span className="mt-1 inline-block text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                      Saldo Pendiente
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Collapsed columns */}
      <details className="flex-shrink-0">
        <summary className="cursor-pointer text-sm text-gray-500 px-2 py-1">
          Archivadas ({COLLAPSED_COLUMNS.reduce((acc, c) => acc + quotes.filter(q => q.status === c.key).length, 0)})
        </summary>
        <div className="flex gap-3 mt-2">
          {COLLAPSED_COLUMNS.map(col => (
            <div key={col.key} className="w-64 bg-gray-100 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">{col.label}</h3>
              {quotes.filter(q => q.status === col.key).map(quote => (
                <div key={quote.id} className="bg-white rounded p-2 text-xs text-gray-600 mb-1">
                  #{quote.quote_number} — {quote.clients?.name ?? '—'}
                </div>
              ))}
            </div>
          ))}
        </div>
      </details>

      {/* Backward move confirmation dialog */}
      {confirmMove && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Mover hacia atrás</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Confirmas mover esta cotización de{' '}
              <strong>{KANBAN_COLUMNS.find(c => c.key === confirmMove.from)?.label}</strong>{' '}
              a <strong>{KANBAN_COLUMNS.find(c => c.key === confirmMove.to)?.label}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmMove(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const { quoteId, to } = confirmMove
                  setConfirmMove(null)
                  try {
                    await onStatusChange(quoteId, to)
                  } catch (error) {
                    console.error('Failed to update quote status:', error)
                  }
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
