import { createServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'border-l-slate-400',
  sent: 'border-l-orange-500',
  viewed: 'border-l-purple-500',
  accepted: 'border-l-emerald-500',
  rejected: 'border-l-red-500',
  expired: 'border-l-slate-300',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-orange-100 text-orange-700',
  viewed: 'bg-purple-100 text-purple-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-500',
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
    <div className="space-y-6">
      {/* Urgent Reminders Banner — Phase 6.4 */}
      {overdueReminders.length > 0 && (
        <Link href="/dashboard/reminders">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/15 transition-colors cursor-pointer">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-orange-400">
                {overdueReminders.length} recordatorio{overdueReminders.length > 1 ? 's' : ''} vencido{overdueReminders.length > 1 ? 's' : ''}
              </span>
              <span className="text-sm text-orange-400/70 ml-2">
                — requieren atención inmediata
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-orange-500 shrink-0" />
          </div>
        </Link>
      )}

      {/* Welcome Header */}
      <div>
        <h2 className="text-2xl font-bold">
          Bienvenido, {firstName}
        </h2>
        <p className="text-muted-foreground mt-0.5">
          {orgName} — resumen del negocio
        </p>
      </div>

      {/* KPI Cards — Phase 6.1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Clients */}
        <Card className="group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes</CardTitle>
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Users className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{totalClients ?? 0}</div>
            <div className="mt-1.5 flex items-center justify-between">
              <TrendBadge value={clientTrend} />
              <Link href="/dashboard/clients" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-0.5">
                Ver <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quotes */}
        <Card className="group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cotizaciones</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <FileText className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{quotes?.length ?? 0}</div>
            <div className="mt-1.5 flex items-center justify-between">
              <TrendBadge value={quoteTrend} />
              <Link href="/dashboard/quotes" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-0.5">
                Ver <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Aceptados</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              ${totalRevenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
            </div>
            <div className="mt-1.5">
              <span className="text-xs text-muted-foreground">
                {acceptanceRate.toFixed(0)}% tasa de aceptación
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card className={`group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ${
          overdueReminders.length > 0 ? 'border-orange-500/40' : ''
        }`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recordatorios</CardTitle>
            <div className={`p-2 rounded-lg ${overdueReminders.length > 0 ? 'bg-orange-500/10' : 'bg-yellow-500/10'}`}>
              <Bell className={`h-4 w-4 ${overdueReminders.length > 0 ? 'text-orange-500' : 'text-yellow-500'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold tracking-tight ${overdueReminders.length > 0 ? 'text-orange-500' : ''}`}>
              {pendingReminders}
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              {overdueReminders.length > 0 ? (
                <span className="text-xs text-orange-500 font-medium">
                  {overdueReminders.length} vencido{overdueReminders.length > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">pendientes</span>
              )}
              <Link href="/dashboard/reminders" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-0.5">
                Ver <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote Status Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[
          { label: 'Borradores', count: quoteCounts.draft, color: 'border-l-slate-400', text: 'text-slate-500' },
          { label: 'Enviadas', count: quoteCounts.sent, color: 'border-l-orange-500', text: 'text-orange-600' },
          { label: 'Aceptadas', count: quoteCounts.accepted, color: 'border-l-emerald-500', text: 'text-emerald-600' },
          { label: 'Rechazadas', count: quoteCounts.rejected, color: 'border-l-red-500', text: 'text-red-600' },
        ].map((item) => (
          <Card key={item.label} className={`border-l-4 ${item.color} hover:-translate-y-0.5 hover:shadow-md transition-all duration-200`}>
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{item.label}</div>
              <div className={`text-2xl font-bold mt-1 ${item.text}`}>{item.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Recent Quotes — Phase 6.2 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base font-semibold">Cotizaciones Recientes</CardTitle>
              <Link href="/dashboard/quotes">
                <Button variant="ghost" size="sm" className="text-xs text-orange-500 hover:text-orange-400 gap-1">
                  Ver todas <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {recentQuotes.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No hay cotizaciones aún.</p>
                  <Link href="/dashboard/quotes/new" className="mt-3 inline-block">
                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Nueva Cotización
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
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
                        className={`flex items-center justify-between px-6 py-3.5 border-l-[3px] ${STATUS_COLORS[status] ?? 'border-l-slate-300'} hover:bg-muted/40 transition-colors`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{quote.quote_number}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                              <span className="truncate max-w-[160px]">{clientName}</span>
                              <span className="text-muted-foreground/40">·</span>
                              <span className="flex items-center gap-0.5 shrink-0">
                                <Clock className="w-3 h-3" />
                                {dateStr}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="text-sm font-semibold">
                            ${Number(quote.total ?? 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_COLORS[status] ?? 'bg-slate-100 text-slate-700'}`}>
                            {STATUS_LABELS[status] ?? status}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                  <div className="px-6 py-3 flex justify-center border-t-0">
                    <Link href="/dashboard/quotes" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
                      Ver todas las cotizaciones <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Quick Actions + Pending Reminders */}
        <div className="space-y-4">
          {/* Quick Actions — Phase 6.3 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Link href="/dashboard/quotes/new" className="block">
                <div className="group flex items-center gap-4 p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 hover:border-orange-500/30 transition-all duration-150 cursor-pointer">
                  <div className="p-2.5 rounded-lg bg-orange-500/20 group-hover:bg-orange-500/30 transition-colors">
                    <FileText className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-orange-400">Nueva Cotización</div>
                    <div className="text-xs text-muted-foreground">Crea y envía al cliente</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-500/50 ml-auto group-hover:text-orange-500 transition-colors" />
                </div>
              </Link>

              <Link href="/dashboard/clients/new" className="block">
                <div className="group flex items-center gap-4 p-3.5 rounded-xl border border-border hover:bg-muted/50 hover:border-border/80 transition-all duration-150 cursor-pointer">
                  <div className="p-2.5 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Nuevo Cliente</div>
                    <div className="text-xs text-muted-foreground">Agrega a tu cartera</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 ml-auto group-hover:text-muted-foreground transition-colors" />
                </div>
              </Link>

              <Link href="/dashboard/reminders/new" className="block">
                <div className="group flex items-center gap-4 p-3.5 rounded-xl border border-border hover:bg-muted/50 hover:border-border/80 transition-all duration-150 cursor-pointer">
                  <div className="p-2.5 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Nuevo Recordatorio</div>
                    <div className="text-xs text-muted-foreground">Seguimiento puntual</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 ml-auto group-hover:text-muted-foreground transition-colors" />
                </div>
              </Link>

              <Link href="/dashboard/analytics" className="block">
                <div className="group flex items-center gap-4 p-3.5 rounded-xl border border-border hover:bg-muted/50 hover:border-border/80 transition-all duration-150 cursor-pointer">
                  <div className="p-2.5 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
                    <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Ver Analytics</div>
                    <div className="text-xs text-muted-foreground">Métricas del negocio</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 ml-auto group-hover:text-muted-foreground transition-colors" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Upcoming Reminders mini-list */}
          {reminders && reminders.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">Próximos Recordatorios</CardTitle>
                <Link href="/dashboard/reminders">
                  <Button variant="ghost" size="sm" className="text-xs text-orange-500 hover:text-orange-400 gap-1 -mr-2">
                    Ver todos <ChevronRight className="w-3 h-3" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2 pb-4">
                {reminders.slice(0, 4).map((reminder) => {
                  const isOverdue = reminder.scheduled_date < today
                  const date = new Date(reminder.scheduled_date).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'short',
                  })
                  return (
                    <Link key={reminder.id} href={`/dashboard/reminders/${reminder.id}`} className="block">
                      <div className={`flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/40 transition-colors ${
                        isOverdue ? 'bg-orange-500/5 border border-orange-500/20' : ''
                      }`}>
                        <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                          isOverdue ? 'bg-orange-500' : 'bg-muted-foreground/40'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">{reminder.title}</div>
                          <div className={`text-xs mt-0.5 ${isOverdue ? 'text-orange-500 font-medium' : 'text-muted-foreground'}`}>
                            {isOverdue ? 'Vencido · ' : ''}{date}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
