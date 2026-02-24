import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Bell, Plus, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ReminderFilters } from './filters'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const REMINDER_TYPE_LABELS: Record<string, string> = {
  follow_up: 'Seguimiento',
  maintenance: 'Mantenimiento',
  renewal: 'Renovación',
  custom: 'Personalizado',
}

const REMINDER_PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  normal: 'Normal',
  low: 'Baja',
}

const REMINDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  sent: 'Enviado',
  completed: 'Completado',
  snoozed: 'Pospuesto',
  cancelled: 'Cancelado',
}

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const activeStatus = status && ['pending', 'sent', 'completed', 'snoozed', 'cancelled'].includes(status)
    ? status
    : undefined

  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const today = new Date().toISOString().split('T')[0]

  let remindersQuery = supabase
    .from('follow_up_reminders')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('scheduled_date', { ascending: true })
    .limit(50)

  if (activeStatus) {
    remindersQuery = remindersQuery.eq('status', activeStatus)
  }
  if (q) {
    remindersQuery = remindersQuery.ilike('title', `%${q}%`)
  }

  // Try without join first to debug
  const { data: reminders } = await remindersQuery


  // If we got reminders, fetch client names separately
  if (reminders && reminders.length > 0) {
    const clientIds = [...new Set(reminders.map(r => r.client_id))]
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, email, phone')
      .in('id', clientIds)

    // Map client data to reminders
    const clientsMap = new Map(clients?.map(c => [c.id, c]) || [])
    reminders.forEach(r => {
      r.clients = clientsMap.get(r.client_id) || null
    })
  }

  const statusCounts = {
    pending: reminders?.filter(r => r.status === 'pending').length || 0,
    overdue: reminders?.filter(r => r.status === 'pending' && r.scheduled_date < today).length || 0,
    completed: reminders?.filter(r => r.status === 'completed').length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recordatorios · {reminders?.length || 0}</h2>
          <p className="text-gray-600">
            Gestiona el seguimiento de tus clientes
          </p>
        </div>
        <Link href="/dashboard/reminders/new">
          <Button className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4" />
            <span>Nuevo Recordatorio</span>
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Bell className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statusCounts.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <Bell className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reminders List */}
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle>Lista de Recordatorios</CardTitle>
          <ReminderFilters activeStatus={activeStatus} defaultSearch={q} />
        </CardHeader>
        <CardContent>
          {!reminders || reminders.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay recordatorios</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comienza creando tu primer recordatorio de seguimiento
              </p>
              <div className="mt-6">
                <Link href="/dashboard/reminders/new">
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Recordatorio
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
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Programada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prioridad
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
                  {reminders.map((reminder) => {
                    const isOverdue = reminder.status === 'pending' && reminder.scheduled_date < today
                    return (
                      <tr key={reminder.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {reminder.clients?.name || 'Sin cliente'}
                          </div>
                          {reminder.clients?.company_name && (
                            <div className="text-sm text-gray-500">
                              {reminder.clients.company_name}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {reminder.title}
                          </div>
                          {reminder.message && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {reminder.message}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                            {new Date(reminder.scheduled_date).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          {isOverdue && (
                            <div className="text-xs text-red-600">Vencido</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={reminder.reminder_type as 'follow_up' | 'maintenance' | 'renewal' | 'custom'}>
                            {REMINDER_TYPE_LABELS[reminder.reminder_type] ?? reminder.reminder_type}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={reminder.priority as 'urgent' | 'high' | 'normal' | 'low'}>
                            {REMINDER_PRIORITY_LABELS[reminder.priority] ?? reminder.priority}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={reminder.status as 'pending' | 'sent' | 'completed' | 'snoozed' | 'cancelled'}>
                            {REMINDER_STATUS_LABELS[reminder.status] ?? reminder.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/dashboard/reminders/${reminder.id}`}
                            className="text-orange-600 hover:text-orange-700"
                          >
                            Ver detalles
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
