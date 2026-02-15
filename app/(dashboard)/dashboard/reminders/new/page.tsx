'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  company_name: string | null
}

export default function NewReminderPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [isRecurring, setIsRecurring] = useState(false)

  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await fetch('/api/clients')
        if (response.ok) {
          const data = await response.json()
          setClients(data.data || [])
        }
      } catch (err) {
        console.error('Error loading clients:', err)
      }
    }

    fetchClients()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const clientId = formData.get('client_id') as string

    if (!clientId) {
      setError('Selecciona un cliente')
      setLoading(false)
      return
    }

    const data = {
      client_id: clientId,
      title: formData.get('title'),
      message: formData.get('message'),
      reminder_type: formData.get('reminder_type'),
      scheduled_date: formData.get('scheduled_date'),
      priority: formData.get('priority'),
      is_recurring: isRecurring,
      recurrence_interval_months: isRecurring ? parseInt(formData.get('recurrence_interval_months') as string) : null,
      related_service_category: formData.get('related_service_category') || null,
    }

    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear recordatorio')
      }

      router.push('/dashboard/reminders')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear recordatorio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/reminders">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nuevo Recordatorio</h2>
          <p className="text-gray-600">Programa un recordatorio de seguimiento</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Recordatorio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Client Selection */}
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente *</Label>
              <select
                id="client_id"
                name="client_id"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona un cliente...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} {client.company_name ? `(${client.company_name})` : ''}
                  </option>
                ))}
              </select>
              {clients.length === 0 && (
                <p className="text-sm text-gray-500">
                  No hay clientes. <Link href="/dashboard/clients/new" className="text-blue-600 hover:underline">Crear cliente</Link>
                </p>
              )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Title */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="Mantenimiento anual de minisplit"
                />
              </div>

              {/* Reminder Type */}
              <div className="space-y-2">
                <Label htmlFor="reminder_type">Tipo de Recordatorio *</Label>
                <select
                  id="reminder_type"
                  name="reminder_type"
                  required
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
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Service Category */}
              <div className="space-y-2">
                <Label htmlFor="related_service_category">Categoría de Servicio</Label>
                <select
                  id="related_service_category"
                  name="related_service_category"
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

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensaje</Label>
              <Textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Hola {cliente}, es momento de programar el mantenimiento anual de tu minisplit..."
              />
              <p className="text-sm text-gray-500">
                Este mensaje se enviará al cliente en la fecha programada
              </p>
            </div>

            {/* Recurring */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="is_recurring" className="cursor-pointer">
                  Recordatorio recurrente
                </Label>
              </div>

              {isRecurring && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="recurrence_interval_months">Repetir cada (meses) *</Label>
                  <Input
                    id="recurrence_interval_months"
                    name="recurrence_interval_months"
                    type="number"
                    min="1"
                    max="36"
                    defaultValue="12"
                    required={isRecurring}
                  />
                  <p className="text-sm text-gray-500">
                    El recordatorio se creará automáticamente cada vez que se complete
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/reminders">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Recordatorio'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
