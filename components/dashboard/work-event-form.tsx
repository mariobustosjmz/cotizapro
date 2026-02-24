'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { WORK_EVENT_TYPE_OPTIONS } from '@/lib/constants/work-events'

interface Client {
  id: string
  name: string | null
  company_name: string | null
}

interface WorkEventFormProps {
  clients: Client[]
  defaultDate?: string
  defaultHour?: number
  defaultClientId?: string
}

function padZero(num: number): string {
  return String(num).padStart(2, '0')
}

export function WorkEventForm({
  clients,
  defaultDate,
  defaultHour,
  defaultClientId,
}: WorkEventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const todayISO = today.toISOString().split('T')[0]
  const date = defaultDate || todayISO
  const hour = defaultHour ?? 9

  const defaultStartTime = `${date}T${padZero(hour)}:00`
  const defaultEndTime = `${date}T${padZero(hour + 1)}:00`

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError(null)

    try {
      const title = formData.get('title') as string
      const clientId = formData.get('client_id') as string
      const eventType = formData.get('event_type') as string
      const scheduledStart = formData.get('scheduled_start') as string
      const scheduledEnd = formData.get('scheduled_end') as string
      const address = (formData.get('address') as string) || null
      const notes = (formData.get('notes') as string) || null

      // Keep datetime strings as-is (local ISO format)
      // PostgreSQL accepts timestamptz with local ISO strings
      // Server handles timezone conversion correctly
      const payload = {
        title,
        client_id: clientId,
        event_type: eventType,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        address,
        notes,
      }

      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al crear evento')
      }

      // Keep loading true during redirect to prevent state updates on unmounting component
      router.push('/dashboard/calendar')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Título del evento *</Label>
        <Input
          id="title"
          name="title"
          type="text"
          placeholder="p. ej., Instalación de aire acondicionado"
          required
          disabled={loading}
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_id">Cliente *</Label>
        <select
          id="client_id"
          name="client_id"
          required
          disabled={loading}
          defaultValue={defaultClientId || ''}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
        >
          <option value="">Selecciona un cliente</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.company_name || client.name || 'Sin nombre'}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="event_type">Tipo de evento *</Label>
        <select
          id="event_type"
          name="event_type"
          required
          disabled={loading}
          defaultValue="instalacion"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
        >
          {WORK_EVENT_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="scheduled_start">Fecha y hora inicio *</Label>
          <Input
            id="scheduled_start"
            name="scheduled_start"
            type="datetime-local"
            required
            disabled={loading}
            defaultValue={defaultStartTime}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduled_end">Fecha y hora fin *</Label>
          <Input
            id="scheduled_end"
            name="scheduled_end"
            type="datetime-local"
            required
            disabled={loading}
            defaultValue={defaultEndTime}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Dirección (opcional)</Label>
        <Input
          id="address"
          name="address"
          type="text"
          placeholder="Dirección del servicio"
          disabled={loading}
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Notas adicionales sobre el evento"
          disabled={loading}
          maxLength={1000}
          rows={4}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Creando...' : 'Crear evento'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
