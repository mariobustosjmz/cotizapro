import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { TrendingUp, Users, FileText, DollarSign, Bell, BarChart3 } from 'lucide-react'
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
      <div className="py-10 text-center text-sm text-gray-400">Error al cargar analiticas</div>
    )
  }

  const statusLabels: Record<string, string> = {
    draft: 'Borrador',
    sent: 'Enviadas',
    viewed: 'Vistas',
    accepted: 'Aceptadas',
    rejected: 'Rechazadas',
    expired: 'Expiradas',
    en_instalacion: 'En Instalacion',
    completado: 'Completadas',
    cobrado: 'Cobradas',
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    viewed: 'bg-purple-100 text-purple-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-yellow-100 text-yellow-700',
    en_instalacion: 'bg-blue-100 text-blue-700',
    completado: 'bg-teal-100 text-teal-700',
    cobrado: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100">
          <BarChart3 className="w-4 h-4 text-orange-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analiticas</h2>
          <p className="text-xs text-gray-500">Metricas y rendimiento del negocio</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Cotizaciones</span>
            <FileText className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-xl font-bold text-gray-900">{analytics.summary.total_quotes}</p>
          <p className="text-xs text-gray-500">{analytics.quotes.conversion_rate.toFixed(1)}% conversion</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Clientes</span>
            <Users className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-xl font-bold text-gray-900">{analytics.summary.total_clients}</p>
          <p className="text-xs text-gray-500">{analytics.clients.new_this_month} nuevos este mes</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Ingresos</span>
            <DollarSign className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-xl font-bold text-green-600">${analytics.summary.total_revenue.toLocaleString('es-MX')}</p>
          <p className="text-xs text-gray-500">{analytics.revenue.accepted_quotes} aceptadas</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Recordatorios</span>
            <Bell className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-xl font-bold text-yellow-600">{analytics.summary.pending_reminders}</p>
          <p className="text-xs text-gray-500">{analytics.reminders.overdue} atrasados</p>
        </div>
      </div>

      {/* Quotes Analytics */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Cotizaciones por Estado</span>
          </div>
          <div className="p-4 space-y-3">
            {analytics.quotes.by_status.map((item) => {
              const percentage = analytics.summary.total_quotes > 0
                ? (item.count / analytics.summary.total_quotes) * 100
                : 0

              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[item.status]}`}>
                      {statusLabels[item.status]}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Metricas de Cotizaciones</span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Tasa de Conversion</span>
                <span className="text-lg font-bold text-green-600">
                  {analytics.quotes.conversion_rate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${analytics.quotes.conversion_rate}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Valor Promedio</span>
                <span className="text-lg font-bold text-gray-900">
                  ${analytics.quotes.avg_quote_value.toLocaleString('es-MX')}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Valor Total</span>
                <span className="text-lg font-bold text-orange-600">
                  ${analytics.quotes.total_value.toLocaleString('es-MX')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clients and Reminders */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Analisis de Clientes</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-blue-600">{analytics.clients.total}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500">Nuevos (mes)</p>
                <p className="text-lg font-bold text-green-600">{analytics.clients.new_this_month}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-gray-500">Con Cotizaciones</p>
                <p className="text-lg font-bold text-purple-600">{analytics.clients.with_quotes}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-gray-500">Sin Cotizaciones</p>
                <p className="text-lg font-bold text-orange-600">{analytics.clients.without_quotes}</p>
              </div>
            </div>

            {analytics.clients.total > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">
                  {((analytics.clients.with_quotes / analytics.clients.total) * 100).toFixed(1)}% con cotizaciones
                </p>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full"
                    style={{ width: `${(analytics.clients.with_quotes / analytics.clients.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Recordatorios</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-gray-500">Pendientes</p>
                <p className="text-lg font-bold text-yellow-600">{analytics.reminders.pending}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-gray-500">Atrasados</p>
                <p className="text-lg font-bold text-red-600">{analytics.reminders.overdue}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-500">Completados</p>
                <p className="text-lg font-bold text-green-600">{analytics.reminders.completed}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Tasa de Completado</span>
                <span className="text-lg font-bold text-green-600">
                  {analytics.reminders.completion_rate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${analytics.reminders.completion_rate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Analisis de Ingresos</span>
        </div>
        <div className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Ingresos Totales</p>
              <p className="text-xl font-bold text-green-700">
                ${analytics.revenue.total.toLocaleString('es-MX')}
              </p>
              <div className="flex items-center mt-1 text-green-600">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">De {analytics.revenue.accepted_quotes} cotizaciones</span>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Ticket Promedio</p>
              <p className="text-xl font-bold text-orange-700">
                ${analytics.revenue.avg_deal_size.toLocaleString('es-MX')}
              </p>
              <p className="text-xs text-orange-600 mt-1">Por cotizacion aceptada</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Valor Pipeline</p>
              <p className="text-xl font-bold text-purple-700">
                ${analytics.quotes.total_value.toLocaleString('es-MX')}
              </p>
              <p className="text-xs text-purple-600 mt-1">Todas las cotizaciones</p>
            </div>
          </div>
        </div>
      </div>

      {/* Income Analytics */}
      <IncomeAnalytics />
    </div>
  )
}
