import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { QuoteSearchInput } from './search-input'
import { QuotesKanbanWrapper } from '@/components/dashboard/quotes-kanban-wrapper'

const VALID_STATUSES = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'] as const
type QuoteStatus = typeof VALID_STATUSES[number]

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Borradores',
  sent: 'Enviadas',
  viewed: 'Vistas',
  accepted: 'Aceptadas',
  rejected: 'Rechazadas',
  expired: 'Expiradas',
}

const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cotizaciones</h2>
          <p className="text-gray-600">
            Gestiona tus cotizaciones y propuestas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <Link
              href="/dashboard/quotes"
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                !isKanbanView
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Lista
            </Link>
            <Link
              href="/dashboard/quotes?view=kanban"
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                isKanbanView
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kanban
            </Link>
          </div>
          <Link href="/dashboard/quotes/new" data-testid="new-quote-header-btn">
            <Button className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white">
              <Plus className="w-4 h-4" />
              <span>Nueva Cotización</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      {!isKanbanView && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Borradores</CardTitle>
              <FileText className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="draft-quotes-count">{statusCounts.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="sent-quotes-count">{statusCounts.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aceptadas</CardTitle>
              <FileText className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="accepted-quotes-count">{statusCounts.accepted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
              <FileText className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="rejected-quotes-count">{statusCounts.rejected}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban View */}
      {isKanbanView ? (
        <QuotesKanbanWrapper />
      ) : (
        /* Quotes List */
        <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Cotizaciones</CardTitle>
            <div className="flex items-center gap-3">
              <QuoteSearchInput defaultValue={q} />
              {activeStatus && (
                <Link href="/dashboard/quotes" className="text-sm text-orange-600 hover:underline">
                  Ver todas
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/quotes"
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                !activeStatus
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todas
            </Link>
            {VALID_STATUSES.map((s) => (
              <Link
                key={s}
                href={`/dashboard/quotes?status=${s}`}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeStatus === s
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {STATUS_LABELS[s]}
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {!quotes || quotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {activeStatus ? `No hay cotizaciones ${STATUS_LABELS[activeStatus].toLowerCase()}` : 'No hay cotizaciones'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeStatus ? 'Prueba con otro filtro' : 'Comienza creando tu primera cotización'}
              </p>
              {!activeStatus && (
                <div className="mt-6">
                  <Link href="/dashboard/quotes/new" data-testid="new-quote-empty-btn">
                    <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Cotización
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quotes.map((quote) => {
                    const client = quote.clients as unknown as { name: string | null; company_name: string | null } | null
                    return (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {quote.quote_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {client?.name || '—'}
                        </div>
                        {client?.company_name && (
                          <div className="text-sm text-gray-500">
                            {client.company_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(quote.created_at).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          ${quote.total.toLocaleString('es-MX')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={quote.status as QuoteStatus}>
                          {QUOTE_STATUS_LABELS[quote.status as QuoteStatus]}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/dashboard/quotes/${quote.id}`}
                          className="text-orange-600 hover:text-orange-700"
                        >
                          Ver detalles
                        </Link>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  )
}
