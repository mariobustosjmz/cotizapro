'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { ArrowLeft, Trash2, Save, CheckCircle, XCircle, AlertCircle, Timer } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  name: string
}

interface Reminder {
  id: string
  client_id: string
  clients: Client
  title: string
  description: string | null
  reminder_type: string
  scheduled_date: string
  priority: string
  status: string
  is_recurring: boolean
  recurrence_interval_months: number | null
  related_service_category: string | null
  created_at: string
  completed_at: string | null
}

export default function ReminderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const id = resolvedParams.id
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [reminder, setReminder] = useState<Reminder | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showSnoozeModal, setShowSnoozeModal] = useState(false)
  const [snoozeDate, setSnoozeDate] = useState('')

  useEffect(() => {
    async function fetchReminder() {
      if (!id || id === 'undefined') {
        setError('ID de recordatorio invalido')
        return
      }
      try {
        const response = await fetch(`/api/reminders/${id}`)
        if (response.ok) {
          const data = await response.json()
          setReminder(data.data)
        } else {
          setError('Recordatorio no encontrado')
        }
      } catch {
        setError('Error al cargar recordatorio')
      }
    }

    fetchReminder()
  }, [id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      reminder_type: formData.get('reminder_type'),
      scheduled_date: formData.get('scheduled_date'),
      priority: formData.get('priority'),
      related_service_category: formData.get('related_service_category') || null,
    }

    try {
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar recordatorio')
      }

      const updated = await response.json()
      setReminder(updated.data)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar recordatorio')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Estas seguro de eliminar este recordatorio? Esta accion no se puede deshacer.')) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar recordatorio')
      }

      router.push('/dashboard/reminders')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar recordatorio')
      setDeleting(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar estado')
      }

      const updated = await response.json()
      setReminder(updated.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado')
    } finally {
      setLoading(false)
    }
  }

  async function handleSnooze(days?: number) {
    if (days === undefined && !snoozeDate) {
      setError('Debe seleccionar una fecha')
      return
    }

    setLoading(true)
    setError('')

    try {
      let snoozeUntil: string
      if (days) {
        const today = new Date()
        today.setDate(today.getDate() + days)
        snoozeUntil = today.toISOString().split('T')[0]
      } else {
        snoozeUntil = snoozeDate
      }

      const response = await fetch(`/api/reminders/${id}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snooze_until: snoozeUntil }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al posponer')
      }

      const data = await response.json()
      setReminder(data.reminder)
      setShowSnoozeModal(false)
      setSnoozeDate('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al posponer')
    } finally {
      setLoading(false)
    }
  }

  if (!reminder) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">{error || 'Cargando...'}</p>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = reminder.status === 'pending' && reminder.scheduled_date < today

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    normal: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    cancelled: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  }

  const priorityLabels: Record<string, string> = {
    low: 'Baja', normal: 'Normal', high: 'Alta', urgent: 'Urgente',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente', completed: 'Completado', cancelled: 'Cancelado',
  }

  const typeLabels: Record<string, string> = {
    follow_up: 'Seguimiento', maintenance: 'Mantenimiento', renewal: 'Renovacion', custom: 'Personalizado',
  }

  const categoryLabels: Record<string, string> = {
    hvac: 'HVAC', painting: 'Pintura', plumbing: 'Plomeria', electrical: 'Electrico', other: 'Otro',
  }

  const selectClass = 'w-full px-3 py-2 bg-white dark:bg-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/reminders">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{reminder.title}</h2>
              {isOverdue && (
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-[10px] font-medium flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3" />
                  Atrasado
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{reminder.clients.name}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isEditing ? (
            <>
              {reminder.status === 'pending' && (
                <>
                  <Button onClick={() => handleStatusChange('completed')} size="sm" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Completar
                  </Button>
                  <Button onClick={() => setShowSnoozeModal(true)} variant="outline" size="sm" disabled={loading}>
                    <Timer className="w-3.5 h-3.5 mr-1" />
                    Posponer
                  </Button>
                  <Button onClick={() => handleStatusChange('cancelled')} variant="outline" size="sm" disabled={loading}>
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    Cancelar
                  </Button>
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    Editar
                  </Button>
                </>
              )}
              <Button onClick={handleDelete} variant="destructive" size="sm" disabled={deleting}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {deleting ? '...' : 'Eliminar'}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">{error}</div>
      )}

      {/* Snooze Modal */}
      {showSnoozeModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-md w-full border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Posponer Recordatorio</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => handleSnooze(1)}
                  disabled={loading}
                  variant="outline"
                  className="text-sm"
                >
                  1 día
                </Button>
                <Button
                  onClick={() => handleSnooze(3)}
                  disabled={loading}
                  variant="outline"
                  className="text-sm"
                >
                  3 días
                </Button>
                <Button
                  onClick={() => handleSnooze(7)}
                  disabled={loading}
                  variant="outline"
                  className="text-sm"
                >
                  1 semana
                </Button>
              </div>

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  O selecciona una fecha específica
                </label>
                <Input
                  type="date"
                  value={snoozeDate}
                  onChange={(e) => setSnoozeDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="mb-4"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={() => {
                    setShowSnoozeModal(false)
                    setSnoozeDate('')
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => handleSnooze()}
                  disabled={loading || !snoozeDate}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                  size="sm"
                >
                  {loading ? 'Posponiendo...' : 'Posponer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Informacion del Recordatorio</span>
        </div>
        <div className="p-4">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Titulo" htmlFor="title" required>
                <Input id="title" name="title" required defaultValue={reminder.title} />
              </FormField>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Tipo de Recordatorio" htmlFor="reminder_type" required>
                  <select id="reminder_type" name="reminder_type" required defaultValue={reminder.reminder_type} className={selectClass}>
                    <option value="follow_up">Seguimiento</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="renewal">Renovacion</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </FormField>

                <FormField label="Prioridad" htmlFor="priority" required>
                  <select id="priority" name="priority" required defaultValue={reminder.priority} className={selectClass}>
                    <option value="normal">Normal</option>
                    <option value="low">Baja</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </FormField>

                <FormField label="Fecha Programada" htmlFor="scheduled_date" required>
                  <Input id="scheduled_date" name="scheduled_date" type="date" required defaultValue={reminder.scheduled_date} />
                </FormField>

                <FormField label="Categoria de Servicio" htmlFor="related_service_category">
                  <select id="related_service_category" name="related_service_category" defaultValue={reminder.related_service_category || ''} className={selectClass}>
                    <option value="">Ninguna</option>
                    <option value="hvac">HVAC</option>
                    <option value="painting">Pintura</option>
                    <option value="plumbing">Plomeria</option>
                    <option value="electrical">Electrico</option>
                    <option value="other">Otro</option>
                  </select>
                </FormField>
              </div>

              <FormField label="Descripcion" htmlFor="description">
                <Textarea id="description" name="description" rows={2} defaultValue={reminder.description || ''} />
              </FormField>

              <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
                <Button type="submit" size="sm" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {loading ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cliente</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{reminder.clients.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tipo</p>
                  <p className="text-sm text-gray-900 dark:text-white">{typeLabels[reminder.reminder_type] || reminder.reminder_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Prioridad</p>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${priorityColors[reminder.priority]}`}>
                    {priorityLabels[reminder.priority] || reminder.priority}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Estado</p>
                  <span data-testid="reminder-status" className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColors[reminder.status]}`}>
                    {statusLabels[reminder.status] || reminder.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Fecha Programada</p>
                  <p data-testid="due-date" className={`text-sm ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-white'}`}>
                    {new Date(reminder.scheduled_date).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {reminder.related_service_category && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Categoria de Servicio</p>
                    <p className="text-sm text-gray-900 dark:text-white">{categoryLabels[reminder.related_service_category] || reminder.related_service_category}</p>
                  </div>
                )}
              </div>

              {reminder.description && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Descripcion</p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{reminder.description}</p>
                </div>
              )}

              {reminder.is_recurring && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900 rounded-lg p-3">
                  <p className="text-xs font-medium text-orange-700 dark:text-orange-400">Recordatorio Recurrente</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                    Se repite cada {reminder.recurrence_interval_months} {reminder.recurrence_interval_months === 1 ? 'mes' : 'meses'}
                  </p>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Creado</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(reminder.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {reminder.completed_at && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completado</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {new Date(reminder.completed_at).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
