import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { TrendingUp, Users, FileText, DollarSign, Bell, BarChart3 } from 'lucide-react'
import { IncomeAnalytics } from '@/components/dashboard/income-analytics'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'

interface AnalyticsData {
  summary: {
    total_quotes: number
    total_clients: number
    total_reminders: number
    total_services: number
  }
  quotes: {
    by_status: Record<string, number>
    conversion_rate: number
    response_rate: number
    avg_quote_value: number
  }
  revenue: {
    total: number
    this_month: number
    currency: string
  }
  reminders: {
    by_status: Record<string, number>
    due_next_7_days: number
    overdue: number
  }
  recent_activity: {
    new_clients: number
    new_quotes: number
    period_days: number
  }
  top_services: Array<{ name: string; category: string; usage_count: number }>
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

  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/analytics/dashboard`, {
    headers: {
      'Cookie': cookieHeader,
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
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex-shrink-0">
          <BarChart3 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Analiticas</h2>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Metricas y rendimiento del negocio</p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Cotizaciones</span>
            <FileText className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics.summary.total_quotes}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{analytics.quotes.conversion_rate.toFixed(1)}% conversion</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Clientes</span>
            <Users className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{analytics.summary.total_clients}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{analytics.recent_activity.new_clients} nuevos ({analytics.recent_activity.period_days}d)</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Ingresos</span>
            <DollarSign className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">${analytics.revenue.total.toLocaleString('es-MX')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">${analytics.revenue.this_month.toLocaleString('es-MX')} este mes</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Recordatorios</span>
            <Bell className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{analytics.summary.total_reminders}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{analytics.reminders.overdue} atrasados</p>
        </div>
      </div>

      {/* Charts — Donut, Funnel, Revenue Bar */}
      <AnalyticsCharts />

      {/* Quotes Analytics */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Cotizaciones por Estado</span>
          </div>
          <div className="p-4 space-y-3">
            {Object.entries(analytics.quotes.by_status).map(([status, count]) => {
              const percentage = analytics.summary.total_quotes > 0
                ? (count / analytics.summary.total_quotes) * 100
                : 0

              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
                      {statusLabels[status] || status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
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

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Metricas de Cotizaciones</span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Tasa de Conversion</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {analytics.quotes.conversion_rate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${analytics.quotes.conversion_rate}%` }}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Valor Promedio</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  ${analytics.quotes.avg_quote_value.toLocaleString('es-MX')}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Tasa de Respuesta</span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {analytics.quotes.response_rate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clients and Reminders */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Analisis de Clientes</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Clientes</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{analytics.summary.total_clients}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Nuevos ({analytics.recent_activity.period_days}d)</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{analytics.recent_activity.new_clients}</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Servicios</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{analytics.summary.total_services}</p>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Nuevas Cotizaciones</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{analytics.recent_activity.new_quotes}</p>
              </div>
            </div>

            {analytics.top_services.length > 0 && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Servicios mas usados</p>
                {analytics.top_services.slice(0, 3).map((svc) => (
                  <div key={svc.name} className="flex items-center justify-between text-xs py-1">
                    <span className="text-gray-700 dark:text-gray-300 truncate">{svc.name}</span>
                    <span className="font-semibold text-gray-900 dark:text-white ml-2">{svc.usage_count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Recordatorios</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Pendientes</p>
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{analytics.reminders.by_status.pending || 0}</p>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Atrasados</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{analytics.reminders.overdue}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400">Completados</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{analytics.reminders.by_status.completed || 0}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Proximos 7 dias</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {analytics.reminders.due_next_7_days}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Analisis de Ingresos</span>
        </div>
        <div className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="p-4 bg-gradient-to-br from-green-50 dark:from-green-900/20 to-green-100 dark:to-green-900/10 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ingresos Totales</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                ${analytics.revenue.total.toLocaleString('es-MX')}
              </p>
              <div className="flex items-center mt-1 text-green-600 dark:text-green-400">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                <span className="text-xs">{analytics.revenue.currency}</span>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-orange-50 dark:from-orange-900/20 to-orange-100 dark:to-orange-900/10 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Este Mes</p>
              <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
                ${analytics.revenue.this_month.toLocaleString('es-MX')}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Ingresos del mes actual</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 dark:from-purple-900/20 to-purple-100 dark:to-purple-900/10 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Valor Promedio</p>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-400">
                ${analytics.quotes.avg_quote_value.toLocaleString('es-MX')}
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Por cotizacion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Income Analytics */}
      <IncomeAnalytics />
    </div>
  )
}
