import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Users,
  FileText,
  Bell,
  TrendingUp,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  Clock,
  DollarSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function TrendBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
        <Minus className="w-3 h-3" />
        Sin cambio
      </span>
    )
  }
  const isUp = value > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isUp ? 'text-emerald-500' : 'text-red-500'
      }`}
    >
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isUp ? '+' : ''}{value.toFixed(0)}{suffix} vs mes anterior
    </span>
  )
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  viewed: 'Vista',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  en_instalacion: 'En Instalación',
  completado: 'Completado',
  cobrado: 'Cobrado',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'border-l-slate-400',
  sent: 'border-l-orange-500',
  viewed: 'border-l-purple-500',
  accepted: 'border-l-emerald-500',
  rejected: 'border-l-red-500',
  expired: 'border-l-slate-300',
  en_instalacion: 'border-l-blue-500',
  completado: 'border-l-teal-500',
  cobrado: 'border-l-green-600',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-orange-100 text-orange-700',
  viewed: 'bg-purple-100 text-purple-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
  en_instalacion: 'bg-blue-100 text-blue-700',
  completado: 'bg-teal-100 text-teal-700',
  cobrado: 'bg-green-100 text-green-700',
}

export default async function DashboardPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organizations(name)')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const orgId = profile.organization_id
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: totalClients },
    { count: clientsThisMonth },
    { count: clientsLastMonth },
    { data: quotes },
    { data: reminders },
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('created_at', thisMonthStart),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .gte('created_at', lastMonthStart)
      .lt('created_at', lastMonthEnd),
    supabase
      .from('quotes')
      .select('id, status, total, quote_number, created_at, clients(name, company_name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('follow_up_reminders')
      .select('id, title, status, scheduled_date, priority')
      .eq('organization_id', orgId)
      .eq('status', 'pending')
      .order('scheduled_date', { ascending: true })
      .limit(100),
  ])

  const quoteCounts = {
    draft: quotes?.filter(q => q.status === 'draft').length ?? 0,
    sent: quotes?.filter(q => q.status === 'sent').length ?? 0,
    accepted: quotes?.filter(q => q.status === 'accepted').length ?? 0,
    rejected: quotes?.filter(q => q.status === 'rejected').length ?? 0,
  }

  const totalRevenue = quotes
    ?.filter(q => q.status === 'accepted')
    .reduce((sum, q) => sum + Number(q.total ?? 0), 0) ?? 0

  const quotesThisMonth = quotes?.filter(q => q.created_at >= thisMonthStart).length ?? 0
  const quotesLastMonth = quotes?.filter(
    q => q.created_at >= lastMonthStart && q.created_at < lastMonthEnd
  ).length ?? 0

  const overdueReminders = reminders?.filter(r => r.scheduled_date < today) ?? []
  const pendingReminders = reminders?.length ?? 0
  const recentQuotes = quotes?.slice(0, 6) ?? []

  // Trend calculation
  const clientTrend = (clientsLastMonth ?? 0) > 0
    ? (((clientsThisMonth ?? 0) - (clientsLastMonth ?? 0)) / (clientsLastMonth ?? 1)) * 100
    : 0
  const quoteTrend = quotesLastMonth > 0
    ? ((quotesThisMonth - quotesLastMonth) / quotesLastMonth) * 100
    : 0

  const acceptanceRate = (quotes?.length ?? 0) > 0
    ? (quoteCounts.accepted / (quotes?.length ?? 1)) * 100
    : 0

  const orgName = (profile.organizations as { name?: string } | null)?.name
  const firstName = profile.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Usuario'

  return (
    <div className="space-y-4">
      {/* Urgent Reminders Banner */}
      {overdueReminders.length > 0 && (
        <Link href="/dashboard/reminders">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-orange-50 border border-orange-200 hover:bg-orange-100/60 transition-colors cursor-pointer">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-orange-700">
                {overdueReminders.length} recordatorio{overdueReminders.length > 1 ? 's' : ''} vencido{overdueReminders.length > 1 ? 's' : ''}
              </span>
              <span className="text-sm text-orange-600/70 ml-2">
                — requieren atencion inmediata
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-orange-500 shrink-0" />
          </div>
        </Link>
      )}

      {/* Welcome Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Bienvenido, {firstName}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {orgName} — resumen del negocio
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Clientes</span>
            <div className="p-1.5 rounded-lg bg-orange-100">
              <Users className="h-3.5 w-3.5 text-orange-500" />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900">{totalClients ?? 0}</div>
          <div className="mt-1 flex items-center justify-between">
            <TrendBadge value={clientTrend} />
            <Link href="/dashboard/clients" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-0.5">
              Ver <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Cotizaciones</span>
            <div className="p-1.5 rounded-lg bg-purple-100">
              <FileText className="h-3.5 w-3.5 text-purple-500" />
            </div>
          </div>
          <div className="text-xl font-bold text-gray-900">{quotes?.length ?? 0}</div>
          <div className="mt-1 flex items-center justify-between">
            <TrendBadge value={quoteTrend} />
            <Link href="/dashboard/quotes" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-0.5">
              Ver <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Ingresos Aceptados</span>
            <div className="p-1.5 rounded-lg bg-emerald-100">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            </div>
          </div>
          <div className="text-xl font-bold text-green-600">
            ${totalRevenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
          </div>
          <div className="mt-1">
            <span className="text-xs text-gray-500">
              {acceptanceRate.toFixed(0)}% tasa de aceptacion
            </span>
          </div>
        </div>

        <div className={`bg-white rounded-xl border p-3 ${
          overdueReminders.length > 0 ? 'border-orange-300' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-500">Recordatorios</span>
            <div className={`p-1.5 rounded-lg ${overdueReminders.length > 0 ? 'bg-orange-100' : 'bg-yellow-100'}`}>
              <Bell className={`h-3.5 w-3.5 ${overdueReminders.length > 0 ? 'text-orange-500' : 'text-yellow-500'}`} />
            </div>
          </div>
          <div className={`text-xl font-bold ${overdueReminders.length > 0 ? 'text-orange-500' : 'text-gray-900'}`}>
            {pendingReminders}
          </div>
          <div className="mt-1 flex items-center justify-between">
            {overdueReminders.length > 0 ? (
              <span className="text-xs text-orange-500 font-medium">
                {overdueReminders.length} vencido{overdueReminders.length > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-xs text-gray-500">pendientes</span>
            )}
            <Link href="/dashboard/reminders" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-0.5">
              Ver <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quote Status Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'Borradores', count: quoteCounts.draft, color: 'border-l-slate-400', text: 'text-slate-500' },
          { label: 'Enviadas', count: quoteCounts.sent, color: 'border-l-orange-500', text: 'text-orange-600' },
          { label: 'Aceptadas', count: quoteCounts.accepted, color: 'border-l-emerald-500', text: 'text-emerald-600' },
          { label: 'Rechazadas', count: quoteCounts.rejected, color: 'border-l-red-500', text: 'text-red-600' },
        ].map((item) => (
          <div key={item.label} className={`bg-white rounded-xl border border-gray-200 border-l-4 ${item.color} p-3`}>
            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{item.label}</div>
            <div className={`text-xl font-bold mt-0.5 ${item.text}`}>{item.count}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Recent Quotes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Cotizaciones Recientes</span>
              <Link href="/dashboard/quotes">
                <Button variant="ghost" size="sm" className="text-xs text-orange-500 hover:text-orange-400 gap-1 h-7">
                  Ver todas <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            {recentQuotes.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <FileText className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No hay cotizaciones aun.</p>
                <Link href="/dashboard/quotes/new" className="mt-3 inline-block">
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Nueva Cotizacion
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentQuotes.map((quote) => {
                  const client = quote.clients as { name?: string; company_name?: string } | null
                  const clientName = client?.company_name || client?.name || 'Sin cliente'
                  const dateStr = new Date(quote.created_at).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })
                  const status = quote.status as string
                  return (
                    <Link
                      key={quote.id}
                      href={`/dashboard/quotes/${quote.id}`}
                      className={`flex items-center justify-between px-4 py-2.5 border-l-[3px] ${STATUS_COLORS[status] ?? 'border-l-slate-300'} hover:bg-orange-50/40 transition-colors`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{quote.quote_number}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                          <span className="truncate max-w-[160px]">{clientName}</span>
                          <span className="text-gray-300">·</span>
                          <span className="flex items-center gap-0.5 shrink-0">
                            <Clock className="w-3 h-3" />
                            {dateStr}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <div className="text-sm font-semibold text-gray-900">
                          ${Number(quote.total ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE_COLORS[status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {STATUS_LABELS[status] ?? status}
                        </span>
                      </div>
                    </Link>
                  )
                })}
                <div className="px-4 py-2.5 flex justify-center">
                  <Link href="/dashboard/quotes" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
                    Ver todas las cotizaciones <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions + Pending Reminders */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-900">Acciones Rapidas</span>
            </div>
            <div className="p-3 space-y-2">
              <Link href="/dashboard/quotes/new" className="block">
                <div className="group flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200 hover:bg-orange-100/60 transition-all duration-150 cursor-pointer">
                  <div className="p-2 rounded-lg bg-orange-200/60">
                    <FileText className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-orange-700">Nueva Cotizacion</div>
                    <div className="text-xs text-orange-600/70">Crea y envia al cliente</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-400 ml-auto" />
                </div>
              </Link>

              {[
                { href: '/dashboard/clients/new', icon: Users, label: 'Nuevo Cliente', desc: 'Agrega a tu cartera' },
                { href: '/dashboard/reminders/new', icon: Bell, label: 'Nuevo Recordatorio', desc: 'Seguimiento puntual' },
                { href: '/dashboard/analytics', icon: TrendingUp, label: 'Ver Analytics', desc: 'Metricas del negocio' },
              ].map((action) => (
                <Link key={action.href} href={action.href} className="block">
                  <div className="group flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-all duration-150 cursor-pointer">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <action.icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900">{action.label}</div>
                      <div className="text-xs text-gray-500">{action.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming Reminders mini-list */}
          {reminders && reminders.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Proximos Recordatorios</span>
                <Link href="/dashboard/reminders">
                  <Button variant="ghost" size="sm" className="text-xs text-orange-500 hover:text-orange-400 gap-1 h-7 -mr-2">
                    Ver todos <ChevronRight className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
              <div className="p-3 space-y-1.5">
                {reminders.slice(0, 4).map((reminder) => {
                  const isOverdue = reminder.scheduled_date < today
                  const date = new Date(reminder.scheduled_date).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })
                  return (
                    <Link key={reminder.id} href={`/dashboard/reminders/${reminder.id}`} className="block">
                      <div className={`flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                        isOverdue ? 'bg-orange-50/50 border border-orange-200' : ''
                      }`}>
                        <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                          isOverdue ? 'bg-orange-500' : 'bg-gray-300'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-gray-900 truncate">{reminder.title}</div>
                          <div className={`text-xs mt-0.5 ${isOverdue ? 'text-orange-500 font-medium' : 'text-gray-500'}`}>
                            {isOverdue ? 'Vencido · ' : ''}{date}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
