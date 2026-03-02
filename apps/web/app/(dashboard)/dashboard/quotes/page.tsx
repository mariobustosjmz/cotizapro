import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { QuoteSearchInput } from './search-input'
import { QuotesKanbanWrapper } from '@/components/dashboard/quotes-kanban-wrapper'
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
  en_instalacion: 'En Instalaci\u00f3n',
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
  en_instalacion: 'En Instalaci\u00f3n',
  completado: 'Completada',
  cobrado: 'Cobrada',
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; view?: string }>
}) {
  const { status, q, view } = await searchParams
  const activeStatus = VALID_STATUSES.includes(status as QuoteStatus)
    ? (status as QuoteStatus)
    : undefined
  const isKanbanView = view === 'kanban'

  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  let listQuery = supabase
    .from('quotes')
    .select('id, quote_number, status, total, created_at, clients(name, company_name)')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (activeStatus) {
    listQuery = listQuery.eq('status', activeStatus)
  }
  if (q) {
    listQuery = listQuery.ilike('quote_number', `%${q}%`)
  }

  const [{ data: quotes }, { data: allQuotes }] = await Promise.all([
    listQuery,
    supabase
      .from('quotes')
      .select('id, status')
      .eq('organization_id', profile.organization_id)
      .limit(500),
  ])

  const statusCounts = {
    draft: allQuotes?.filter(q => q.status === 'draft').length || 0,
    sent: allQuotes?.filter(q => q.status === 'sent').length || 0,
    accepted: allQuotes?.filter(q => q.status === 'accepted').length || 0,
    rejected: allQuotes?.filter(q => q.status === 'rejected').length || 0,
  }

  return (
    <div className="space-y-4">
      {/* Header with inline stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex-shrink-0">
            <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Cotizaciones</h2>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-sm">
              <span className="text-gray-500 dark:text-gray-400" data-testid="draft-quotes-count">{statusCounts.draft} borradores</span>
              <span className="text-orange-600 dark:text-orange-400" data-testid="sent-quotes-count">{statusCounts.sent} enviadas</span>
              <span className="text-green-600 dark:text-green-400" data-testid="accepted-quotes-count">{statusCounts.accepted} aceptadas</span>
              <span className="text-red-500 dark:text-red-400" data-testid="rejected-quotes-count">{statusCounts.rejected} rechazadas</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 flex-1 sm:flex-none">
            <Link
              href="/dashboard/quotes"
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors flex-1 sm:flex-none text-center sm:text-left ${
                !isKanbanView
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Lista
            </Link>
            <Link
              href="/dashboard/quotes?view=kanban"
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors flex-1 sm:flex-none text-center sm:text-left ${
                isKanbanView
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Kanban
            </Link>
          </div>
          <Link href="/dashboard/quotes/new" data-testid="new-quote-header-btn" className="w-full sm:w-auto">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-1" />
              Nueva
            </Button>
          </Link>
        </div>
      </div>

      {/* Kanban View */}
      {isKanbanView ? (
        <QuotesKanbanWrapper />
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <QuoteSearchInput defaultValue={q} />
                {activeStatus && (
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
                  !activeStatus
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
                    activeStatus === s
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
                {activeStatus ? `No hay cotizaciones ${STATUS_LABELS[activeStatus].toLowerCase()}` : 'No hay cotizaciones'}
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {activeStatus ? 'Prueba con otro filtro' : 'Comienza creando tu primera cotizaci\u00f3n'}
              </p>
              {!activeStatus && (
                <div className="mt-4">
                  <Link href="/dashboard/quotes/new" data-testid="new-quote-empty-btn">
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                      <Plus className="w-4 h-4 mr-1" />
                      Nueva Cotizaci\u00f3n
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                <thead className="bg-gray-50/60 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">N\u00famero</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cliente</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Fecha</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {quotes.map((quote) => {
                    const client = quote.clients as unknown as { name: string | null; company_name: string | null } | null
                    return (
                    <tr key={quote.id} className="hover:bg-orange-50/40 dark:hover:bg-gray-800 cursor-pointer">
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{quote.quote_number}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-sm text-gray-900 dark:text-white">{client?.name || '\u2014'}</div>
                        {client?.company_name && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">{client.company_name}</div>
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
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
