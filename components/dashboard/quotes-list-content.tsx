'use client'

import { useEffect, useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pagination } from '@/components/ui/pagination'
import { QuoteSearchInput } from '@/app/(dashboard)/dashboard/quotes/search-input'
import type { QuoteStatus } from '@/lib/validations/cotizapro'
import { quoteStatusSchema } from '@/lib/validations/cotizapro'

const VALID_STATUSES = quoteStatusSchema.options as readonly QuoteStatus[]

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Borradores',
  sent: 'Enviadas',
  viewed: 'Vistas',
  accepted: 'Aceptadas',
  rejected: 'Rechazadas',
  expired: 'Expiradas',
  en_instalacion: 'En Instalación',
  completado: 'Completadas',
  cobrado: 'Cobradas',
}

const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  en_instalacion: 'En Instalación',
  completado: 'Completada',
  cobrado: 'Cobrada',
}

interface Quote {
  id: string
  quote_number: string
  status: QuoteStatus
  total: number
  created_at: string
  client: { name: string | null; email: string | null } | null
}

interface QuotesListContentProps {
  initialStatus?: QuoteStatus
  initialSearch?: string
  statusCounts: Record<string, number>
}

const ITEMS_PER_PAGE = 20

export function QuotesListContent({
  initialStatus,
  initialSearch = '',
  statusCounts,
}: QuotesListContentProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(initialSearch)

  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          limit: ITEMS_PER_PAGE.toString(),
          offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
        })

        if (initialStatus) {
          params.append('status', initialStatus)
        }

        if (searchTerm) {
          params.append('q', searchTerm)
        }

        const response = await fetch(`/api/quotes?${params.toString()}`)
        const result = await response.json()

        if (result.data) {
          setQuotes(result.data)
          setTotal(result.total || 0)
        }
      } catch (error) {
        console.error('Error fetching quotes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchQuotes()
  }, [currentPage, initialStatus, searchTerm])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1)
  }

  if (loading && currentPage === 1) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-8 text-center">
          <div className="animate-pulse flex justify-center">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QuoteSearchInput defaultValue={searchTerm} onSearch={handleSearch} />
            {initialStatus && (
              <Link href="/dashboard/quotes" className="text-xs text-orange-600 dark:text-orange-400 hover:underline">
                Ver todas
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Link
            href="/dashboard/quotes"
            className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !initialStatus
                ? 'bg-gray-900 dark:bg-gray-700 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Todas
          </Link>
          {VALID_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/dashboard/quotes?status=${s}`}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                initialStatus === s
                  ? 'bg-gray-900 dark:bg-gray-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {STATUS_LABELS[s]}
            </Link>
          ))}
        </div>
      </div>

      {!quotes || quotes.length === 0 ? (
        <div className="text-center py-10">
          <FileText className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {initialStatus ? `No hay cotizaciones ${STATUS_LABELS[initialStatus].toLowerCase()}` : 'No hay cotizaciones'}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {initialStatus ? 'Prueba con otro filtro' : 'Comienza creando tu primera cotización'}
          </p>
          {!initialStatus && (
            <div className="mt-4">
              <Link href="/dashboard/quotes/new" data-testid="new-quote-empty-btn">
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="w-4 h-4 mr-1" />
                  Nueva Cotización
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
              <thead className="bg-gray-50/60 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Número</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cliente</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Fecha</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {quotes.map((quote) => {
                  return (
                    <tr key={quote.id} className="hover:bg-orange-50/40 dark:hover:bg-gray-800 cursor-pointer">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{quote.quote_number}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-sm text-gray-900 dark:text-white">{quote.client?.name || '—'}</div>
                        {quote.client?.email && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">{quote.client.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap hidden md:table-cell">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {new Date(quote.created_at).toLocaleDateString('es-MX', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          ${Number(quote.total).toLocaleString('es-MX')}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <Badge variant={quote.status as QuoteStatus} className="text-[10px]">
                          {QUOTE_STATUS_LABELS[quote.status as QuoteStatus]}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        <Link
                          href={`/dashboard/quotes/${quote.id}`}
                          className="inline-flex items-center justify-center px-2 py-1.5 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium rounded"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={total}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  )
}
