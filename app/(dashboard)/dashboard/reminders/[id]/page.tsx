'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Trash2, Save, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
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

  console.log('[ReminderDetails] Component mounted, resolvedParams:', resolvedParams, 'id:', id)

  useEffect(() => {
    async function fetchReminder() {
      console.log('[ReminderDetails] useEffect triggered, id:', id, 'type:', typeof id)
      if (!id || id === 'undefined') {
        console.error('[ReminderDetails] No valid ID provided!')
        setError('ID de recordatorio inválido')
        return
      }
      try {
        console.log('[ReminderDetails] Fetching reminder:', id)
        const response = await fetch(`/api/reminders/${id}`)
        console.log('[ReminderDetails] Response status:', response.status, response.statusText)

        if (response.ok) {
          const data = await response.json()
          console.log('[ReminderDetails] Response data:', data)
          setReminder(data.data)
        } else {
          const errorText = await response.text()
          console.error('[ReminderDetails] Error response:', response.status, errorText)
          setError('Recordatorio no encontrado')
        }
      } catch (err) {
        console.error('[ReminderDetails] Fetch error:', err)
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
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar recordatorio')
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
    if (!confirm('¿Estás seguro de eliminar este recordatorio? Esta acción no se puede deshacer.')) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar recordatorio')
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
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar estado')
      }

      const updated = await response.json()
      setReminder(updated.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar estado')
    } finally {
      setLoading(false)
    }
  }

  if (!reminder) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = reminder.status === 'pending' && reminder.scheduled_date < today

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/reminders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">{reminder.title}</h1>
              {isOverdue && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Atrasado
                </span>
              )}
            </div>
            <p className="text-gray-600">
              {reminder.clients.name}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          {!isEditing ? (
            <>
              {reminder.status === 'pending' && (
                <>
                  <Button
                    onClick={() => handleStatusChange('completed')}
                    disabled={loading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Completar
                  </Button>
                  <Button
                    onClick={() => handleStatusChange('cancelled')}
                    variant="outline"
                    disabled={loading}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                  >
                    Editar
                  </Button>
                </>
              )}
              <Button
                onClick={handleDelete}
                variant="destructive"
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(false)}
              variant="outline"
            >
              Cancelar Edición
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Main Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Recordatorio</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  defaultValue={reminder.title}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Reminder Type */}
                <div className="space-y-2">
                  <Label htmlFor="reminder_type">Tipo de Recordatorio *</Label>
                  <select
                    id="reminder_type"
                    name="reminder_type"
                    required
                    defaultValue={reminder.reminder_type}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="follow_up">Seguimiento</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="renewal">Renovación</option>
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridad *</Label>
                  <select
                    id="priority"
                    name="priority"
                    required
                    defaultValue={reminder.priority}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="low">Baja</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                {/* Scheduled Date */}
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Fecha Programada *</Label>
                  <Input
                    id="scheduled_date"
                    name="scheduled_date"
                    type="date"
                    required
                    defaultValue={reminder.scheduled_date}
                  />
                </div>

                {/* Service Category */}
                <div className="space-y-2">
                  <Label htmlFor="related_service_category">Categoría de Servicio</Label>
                  <select
                    id="related_service_category"
                    name="related_service_category"
                    defaultValue={reminder.related_service_category || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Ninguna</option>
                    <option value="hvac">HVAC</option>
                    <option value="painting">Pintura</option>
                    <option value="plumbing">Plomería</option>
                    <option value="electrical">Eléctrico</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={reminder.description || ''}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label className="text-sm text-gray-500">Cliente</Label>
                  <p className="text-gray-900 font-medium">
                    {reminder.clients.name}
                  </p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Tipo</Label>
                  <p className="text-gray-900">
                    {reminder.reminder_type === 'follow_up' && 'Seguimiento'}
                    {reminder.reminder_type === 'maintenance' && 'Mantenimiento'}
                    {reminder.reminder_type === 'renewal' && 'Renovación'}
                    {reminder.reminder_type === 'custom' && 'Personalizado'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Prioridad</Label>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${priorityColors[reminder.priority as keyof typeof priorityColors]}`}>
                    {reminder.priority === 'low' && 'Baja'}
                    {reminder.priority === 'normal' && 'Normal'}
                    {reminder.priority === 'high' && 'Alta'}
                    {reminder.priority === 'urgent' && 'Urgente'}
                  </span>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Estado</Label>
                  <span data-testid="reminder-status" className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[reminder.status as keyof typeof statusColors]}`}>
                    {reminder.status === 'pending' && 'Pendiente'}
                    {reminder.status === 'completed' && 'Completado'}
                    {reminder.status === 'cancelled' && 'Cancelado'}
                  </span>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Fecha Programada</Label>
                  <p data-testid="due-date" className={`text-gray-900 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                    {new Date(reminder.scheduled_date).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {reminder.related_service_category && (
                  <div>
                    <Label className="text-sm text-gray-500">Categoría de Servicio</Label>
                    <p className="text-gray-900">
                      {reminder.related_service_category === 'hvac' && 'HVAC'}
                      {reminder.related_service_category === 'painting' && 'Pintura'}
                      {reminder.related_service_category === 'plumbing' && 'Plomería'}
                      {reminder.related_service_category === 'electrical' && 'Eléctrico'}
                      {reminder.related_service_category === 'other' && 'Otro'}
                    </p>
                  </div>
                )}
              </div>

              {reminder.description && (
                <div>
                  <Label className="text-sm text-gray-500">Descripción</Label>
                  <p className="text-gray-900 whitespace-pre-wrap">{reminder.description}</p>
                </div>
              )}

              {reminder.is_recurring && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <Label className="text-sm text-blue-700 font-medium">Recordatorio Recurrente</Label>
                  <p className="text-blue-600 mt-1">
                    Se repite cada {reminder.recurrence_interval_months} {reminder.recurrence_interval_months === 1 ? 'mes' : 'meses'}
                  </p>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-sm text-gray-500">Fecha de Creación</Label>
                  <p className="text-gray-900">
                    {new Date(reminder.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {reminder.completed_at && (
                  <div>
                    <Label className="text-sm text-gray-500">Fecha de Completado</Label>
                    <p className="text-gray-900">
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
        </CardContent>
      </Card>
    </div>
  )
}
