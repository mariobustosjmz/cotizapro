import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Bell, Plus, AlertCircle, CheckCircle } from 'lucide-react'
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

  const { data: reminders } = await remindersQuery

  if (reminders && reminders.length > 0) {
    const clientIds = [...new Set(reminders.map(r => r.client_id))]
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, email, phone')
      .in('id', clientIds)

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
    <div className="space-y-4">
      {/* Header + inline stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex-shrink-0">
            <Bell className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">Recordatorios</h2>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-sm">
              <span className="text-yellow-600 dark:text-yellow-400">{statusCounts.pending} pendientes</span>
              {statusCounts.overdue > 0 && (
                <span className="text-red-600 dark:text-red-400 font-medium">{statusCounts.overdue} vencidos</span>
              )}
              <span className="text-green-600 dark:text-green-400">{statusCounts.completed} completados</span>
            </div>
          </div>
        </div>
        <Link href="/dashboard/reminders/new" className="w-full sm:w-auto">
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Filters + Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <ReminderFilters activeStatus={activeStatus} defaultSearch={q} />
        </div>

        {!reminders || reminders.length === 0 ? (
          <div className="text-center py-10">
            <Bell className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay recordatorios</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Crea tu primer recordatorio de seguimiento</p>
            <div className="mt-4">
              <Link href="/dashboard/reminders/new">
                <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="w-4 h-4 mr-1" />
                  Nuevo Recordatorio
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
              <thead className="bg-gray-50/60 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cliente</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Título</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Prioridad</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {reminders.map((reminder) => {
                  const isOverdue = reminder.status === 'pending' && reminder.scheduled_date < today
                  return (
                    <tr key={reminder.id} className={`hover:bg-orange-50/40 dark:hover:bg-gray-800 cursor-pointer ${isOverdue ? 'bg-red-50/60 dark:bg-red-900/20' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="text-sm text-gray-900 dark:text-white">{reminder.clients?.name || 'Sin cliente'}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{reminder.title}</div>
                        {reminder.message && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[100px] sm:max-w-[200px]">{reminder.message}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className={`text-sm ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                          {new Date(reminder.scheduled_date).toLocaleDateString('es-MX', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        {isOverdue && <div className="text-[10px] text-red-500 dark:text-red-400">Vencido</div>}
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <Badge variant={reminder.reminder_type as 'follow_up' | 'maintenance' | 'renewal' | 'custom'} className="text-xs">
                          {REMINDER_TYPE_LABELS[reminder.reminder_type] ?? reminder.reminder_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        <Badge variant={reminder.priority as 'urgent' | 'high' | 'normal' | 'low'} className="text-xs">
                          {REMINDER_PRIORITY_LABELS[reminder.priority] ?? reminder.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={reminder.status as 'pending' | 'sent' | 'completed' | 'snoozed' | 'cancelled'} className="text-xs">
                          {REMINDER_STATUS_LABELS[reminder.status] ?? reminder.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/dashboard/reminders/${reminder.id}`}
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
        )}
      </div>
    </div>
  )
}
