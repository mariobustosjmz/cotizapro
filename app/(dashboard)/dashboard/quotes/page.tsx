import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'

export default async function QuotesPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const { data: quotes } = await supabase
    .from('quotes')
    .select('*, clients(name, company_name)')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
    .limit(50)

  const statusCounts = {
    draft: quotes?.filter(q => q.status === 'draft').length || 0,
    sent: quotes?.filter(q => q.status === 'sent').length || 0,
    accepted: quotes?.filter(q => q.status === 'accepted').length || 0,
    rejected: quotes?.filter(q => q.status === 'rejected').length || 0,
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
        <Link href="/dashboard/quotes/new">
          <Button className="flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Nueva Cotización</span>
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borradores</CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aceptadas</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
            <FileText className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quotes List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Cotizaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {!quotes || quotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cotizaciones</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comienza creando tu primera cotización
              </p>
              <div className="mt-6">
                <Link href="/dashboard/quotes/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Cotización
                  </Button>
                </Link>
              </div>
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
                  {quotes.map((quote) => (
                    <tr key={quote.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {quote.quote_number}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {quote.client_name}
                        </div>
                        {quote.clients?.company_name && (
                          <div className="text-sm text-gray-500">
                            {quote.clients.company_name}
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
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            quote.status === 'accepted'
                              ? 'bg-green-100 text-green-800'
                              : quote.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : quote.status === 'sent'
                              ? 'bg-blue-100 text-blue-800'
                              : quote.status === 'viewed'
                              ? 'bg-purple-100 text-purple-800'
                              : quote.status === 'expired'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {quote.status === 'draft' && 'Borrador'}
                          {quote.status === 'sent' && 'Enviada'}
                          {quote.status === 'viewed' && 'Vista'}
                          {quote.status === 'accepted' && 'Aceptada'}
                          {quote.status === 'rejected' && 'Rechazada'}
                          {quote.status === 'expired' && 'Expirada'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/dashboard/quotes/${quote.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ver detalles
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
