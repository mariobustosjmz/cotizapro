import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Users, FileText, DollarSign, Bell } from 'lucide-react'
import { IncomeAnalytics } from '@/components/dashboard/income-analytics'

interface AnalyticsData {
  summary: {
    total_quotes: number
    total_clients: number
    total_revenue: number
    pending_reminders: number
  }
  quotes: {
    by_status: Array<{ status: string; count: number }>
    conversion_rate: number
    avg_quote_value: number
    total_value: number
  }
  clients: {
    new_this_month: number
    total: number
    with_quotes: number
    without_quotes: number
  }
  reminders: {
    pending: number
    overdue: number
    completed: number
    completion_rate: number
  }
  revenue: {
    total: number
    accepted_quotes: number
    avg_deal_size: number
  }
}

export default async function AnalyticsPage() {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/dashboard`, {
    headers: {
      'Cookie': `sb-access-token=${(await supabase.auth.getSession()).data.session?.access_token}`,
    },
    cache: 'no-store',
  })

  const analytics: AnalyticsData = response.ok ? await response.json() : null

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Error al cargar analíticas</p>
      </div>
    )
  }

  const statusLabels: Record<string, string> = {
    draft: 'Borrador',
    sent: 'Enviadas',
    accepted: 'Aceptadas',
    rejected: 'Rechazadas',
    expired: 'Expiradas'
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-yellow-100 text-yellow-700'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analíticas</h2>
        <p className="text-gray-600">Panel de métricas y rendimiento del negocio</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Cotizaciones
            </CardTitle>
            <FileText className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics.summary.total_quotes}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {analytics.quotes.conversion_rate.toFixed(1)}% de conversión
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Clientes
            </CardTitle>
            <Users className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {analytics.summary.total_clients}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {analytics.clients.new_this_month} nuevos este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ingresos Totales
            </CardTitle>
            <DollarSign className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${analytics.summary.total_revenue.toLocaleString('es-MX')}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {analytics.revenue.accepted_quotes} cotizaciones aceptadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Recordatorios
            </CardTitle>
            <Bell className="w-4 h-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {analytics.summary.pending_reminders}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {analytics.reminders.overdue} atrasados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quotes Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cotizaciones por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.quotes.by_status.map((item) => {
                const percentage = analytics.summary.total_quotes > 0
                  ? (item.count / analytics.summary.total_quotes) * 100
                  : 0

                return (
                  <div key={item.status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[item.status]}`}>
                        {statusLabels[item.status]}
                      </span>
                      <span className="font-semibold text-gray-900">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Métricas de Cotizaciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Tasa de Conversión</span>
                <span className="text-2xl font-bold text-green-600">
                  {analytics.quotes.conversion_rate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{ width: `${analytics.quotes.conversion_rate}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Valor Promedio</span>
                <span className="text-xl font-bold text-gray-900">
                  ${analytics.quotes.avg_quote_value.toLocaleString('es-MX')}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Valor Total</span>
                <span className="text-xl font-bold text-blue-600">
                  ${analytics.quotes.total_value.toLocaleString('es-MX')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients and Reminders Analytics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Clientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.clients.total}</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Nuevos (mes)</p>
                <p className="text-2xl font-bold text-green-600">{analytics.clients.new_this_month}</p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Con Cotizaciones</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.clients.with_quotes}</p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Sin Cotizaciones</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.clients.without_quotes}</p>
              </div>
            </div>

            {analytics.clients.total > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">
                  {((analytics.clients.with_quotes / analytics.clients.total) * 100).toFixed(1)}% de clientes tienen cotizaciones
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ width: `${(analytics.clients.with_quotes / analytics.clients.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recordatorios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{analytics.reminders.pending}</p>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Atrasados</p>
                <p className="text-2xl font-bold text-red-600">{analytics.reminders.overdue}</p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Completados</p>
                <p className="text-2xl font-bold text-green-600">{analytics.reminders.completed}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Tasa de Completado</span>
                <span className="text-2xl font-bold text-green-600">
                  {analytics.reminders.completion_rate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{ width: `${analytics.reminders.completion_rate}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Ingresos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Ingresos Totales</p>
              <p className="text-3xl font-bold text-green-700">
                ${analytics.revenue.total.toLocaleString('es-MX')}
              </p>
              <div className="flex items-center mt-2 text-green-600">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span className="text-sm">De {analytics.revenue.accepted_quotes} cotizaciones</span>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Ticket Promedio</p>
              <p className="text-3xl font-bold text-blue-700">
                ${analytics.revenue.avg_deal_size.toLocaleString('es-MX')}
              </p>
              <p className="text-sm text-blue-600 mt-2">Por cotización aceptada</p>
            </div>

            <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Valor Pipeline</p>
              <p className="text-3xl font-bold text-purple-700">
                ${analytics.quotes.total_value.toLocaleString('es-MX')}
              </p>
              <p className="text-sm text-purple-600 mt-2">Todas las cotizaciones</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Analytics */}
      <IncomeAnalytics />
    </div>
  )
}
