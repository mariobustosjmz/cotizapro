import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Bell, Plus, AlertCircle } from 'lucide-react'

export default async function RemindersPage() {
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

  const { data: reminders } = await supabase
    .from('follow_up_reminders')
    .select('*, clients(name, company_name)')
    .eq('organization_id', profile.organization_id)
    .order('scheduled_date', { ascending: true })
    .limit(50)

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
          <h2 className="text-2xl font-bold text-gray-900">Recordatorios</h2>
          <p className="text-gray-600">
            Gestiona el seguimiento de tus clientes
          </p>
        </div>
        <Link href="/dashboard/reminders/new">
          <Button className="flex items-center space-x-2">
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
        <CardHeader>
          <CardTitle>Lista de Recordatorios</CardTitle>
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
                  <Button>
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
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {reminder.reminder_type === 'maintenance' && 'Mantenimiento'}
                            {reminder.reminder_type === 'follow_up' && 'Seguimiento'}
                            {reminder.reminder_type === 'renewal' && 'Renovación'}
                            {reminder.reminder_type === 'custom' && 'Personalizado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              reminder.priority === 'urgent'
                                ? 'bg-red-100 text-red-800'
                                : reminder.priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : reminder.priority === 'normal'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {reminder.priority === 'urgent' && 'Urgente'}
                            {reminder.priority === 'high' && 'Alta'}
                            {reminder.priority === 'normal' && 'Normal'}
                            {reminder.priority === 'low' && 'Baja'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              reminder.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : reminder.status === 'sent'
                                ? 'bg-blue-100 text-blue-800'
                                : reminder.status === 'snoozed'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {reminder.status === 'pending' && 'Pendiente'}
                            {reminder.status === 'sent' && 'Enviado'}
                            {reminder.status === 'completed' && 'Completado'}
                            {reminder.status === 'snoozed' && 'Pospuesto'}
                            {reminder.status === 'cancelled' && 'Cancelado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/dashboard/reminders/${reminder.id}`}
                            className="text-blue-600 hover:text-blue-900"
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
