'use client'

import { useState, useEffect } from 'react'
import { QuotesKanban } from './quotes-kanban'
import type { KanbanQuote } from './quotes-kanban'
import { QuoteStatus } from '@/lib/validations/cotizapro'

interface Quote {
  id: string
  quote_number: string
  total_amount: number | string
  status: QuoteStatus
  updated_at: string
  clients: { name: string | null; company_name: string | null } | null
  has_pending_balance?: boolean
}

interface ApiResponse {
  data: Quote[]
  total: number
  limit: number
  offset: number
}

const SKELETON_ROWS = 5

function LoadingSkeleton(): React.ReactNode {
  return (
    <div className="space-y-2">
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
      ))}
    </div>
  )
}

export function QuotesKanbanWrapper(): React.ReactNode {
  const [quotes, setQuotes] = useState<KanbanQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchQuotes(): Promise<void> {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/quotes?limit=200&offset=0')

        if (!response.ok) {
          throw new Error(`Failed to fetch quotes: ${response.statusText}`)
        }

        const data: ApiResponse = await response.json()
        const transformedQuotes: KanbanQuote[] = data.data.map(quote => ({
          id: quote.id,
          quote_number: quote.quote_number,
          clients: quote.clients,
          total_amount: typeof quote.total_amount === 'string'
            ? parseFloat(quote.total_amount)
            : quote.total_amount,
          status: quote.status,
          updated_at: quote.updated_at,
          has_pending_balance: quote.has_pending_balance,
        }))
        setQuotes(transformedQuotes)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load quotes'
        setError(message)
        console.error('Error fetching quotes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchQuotes()
  }, [])

  const handleStatusChange = async (quoteId: string, newStatus: QuoteStatus): Promise<void> => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update quote status: ${response.statusText}`)
      }

      const data = await response.json()
      const updatedQuote = data.data

      setQuotes(prev =>
        prev.map(q =>
          q.id === quoteId
            ? {
                ...q,
                status: updatedQuote.status,
                updated_at: updatedQuote.updated_at,
              }
            : q
        )
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update quote'
      console.error('Error updating quote status:', err)
      setError(message)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4">
        <h3 className="text-sm font-semibold text-red-800 mb-1">Error al cargar cotizaciones</h3>
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  return <QuotesKanban quotes={quotes} onStatusChange={handleStatusChange} />
}
