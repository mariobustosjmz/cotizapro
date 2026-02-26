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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100">
            <Bell className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Recordatorios</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-yellow-600">{statusCounts.pending} pendientes</span>
              {statusCounts.overdue > 0 && (
                <span className="text-red-600 font-medium">{statusCounts.overdue} vencidos</span>
              )}
              <span className="text-green-600">{statusCounts.completed} completados</span>
            </div>
          </div>
        </div>
        <Link href="/dashboard/reminders/new">
          <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Filters + Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <ReminderFilters activeStatus={activeStatus} defaultSearch={q} />
        </div>

        {!reminders || reminders.length === 0 ? (
          <div className="text-center py-10">
            <Bell className="mx-auto h-10 w-10 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay recordatorios</h3>
            <p className="mt-1 text-xs text-gray-500">Crea tu primer recordatorio de seguimiento</p>
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
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/60">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Prioridad</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reminders.map((reminder) => {
                  const isOverdue = reminder.status === 'pending' && reminder.scheduled_date < today
                  return (
                    <tr key={reminder.id} className={`hover:bg-orange-50/40 cursor-pointer ${isOverdue ? 'bg-red-50/60' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="text-sm text-gray-900">{reminder.clients?.name || 'Sin cliente'}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-sm font-medium text-gray-900">{reminder.title}</div>
                        {reminder.message && (
                          <div className="text-xs text-gray-400 truncate max-w-[200px]">{reminder.message}</div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className={`text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                          {new Date(reminder.scheduled_date).toLocaleDateString('es-MX', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        {isOverdue && <div className="text-[10px] text-red-500">Vencido</div>}
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <Badge variant={reminder.reminder_type as 'follow_up' | 'maintenance' | 'renewal' | 'custom'} className="text-[10px]">
                          {REMINDER_TYPE_LABELS[reminder.reminder_type] ?? reminder.reminder_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell">
                        <Badge variant={reminder.priority as 'urgent' | 'high' | 'normal' | 'low'} className="text-[10px]">
                          {REMINDER_PRIORITY_LABELS[reminder.priority] ?? reminder.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant={reminder.status as 'pending' | 'sent' | 'completed' | 'snoozed' | 'cancelled'} className="text-[10px]">
                          {REMINDER_STATUS_LABELS[reminder.status] ?? reminder.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Link
                          href={`/dashboard/reminders/${reminder.id}`}
                          className="text-xs text-orange-600 hover:text-orange-700 font-medium"
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
