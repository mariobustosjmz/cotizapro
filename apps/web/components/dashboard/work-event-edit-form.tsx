'use client'

import { useState, useRef } from 'react'
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

interface WorkEvent {
  id: string
  title: string
  event_type: string
  scheduled_start: string
  scheduled_end: string
  address: string | null
  notes: string | null
  client_id: string | null
  quote_id: string | null
  status: string
}

interface WorkEventEditFormProps {
  clients: Client[]
  event: WorkEvent
}

type FieldErrors = Record<string, string>

function clientLabel(client: Client): string {
  return client.company_name || client.name || 'Sin nombre'
}

interface ComboboxProps {
  id: string
  name: string
  options: { value: string; label: string }[]
  defaultValue?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  fieldError?: string
}

function Combobox({ id, name, options, defaultValue = '', placeholder, required, disabled, fieldError }: ComboboxProps) {
  const defaultOption = options.find((o) => o.value === defaultValue)
  const [search, setSearch] = useState(defaultOption?.label ?? '')
  const [selectedValue, setSelectedValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  const selectOption = (value: string, label: string) => {
    setSelectedValue(value)
    setSearch(label)
    setOpen(false)
  }

  const hasError = Boolean(fieldError)

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} />
      <input
        id={id}
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setSelectedValue('')
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        className={`w-full px-3 py-2 border rounded-md text-gray-900 dark:text-gray-100 dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 ${
          hasError ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-gray-600'
        }`}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-md border border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 shadow-lg text-sm">
          {filtered.map((o) => (
            <li
              key={o.value}
              onMouseDown={() => selectOption(o.value, o.label)}
              className={`px-3 py-2 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 ${
                o.value === selectedValue ? 'bg-orange-100 dark:bg-orange-900/30 font-medium' : ''
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {hasError && (
        <p className="mt-1 text-xs text-red-600">{fieldError}</p>
      )}
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs text-red-600">{message}</p>
}

function toLocalDatetimeInput(isoString: string): string {
  // Convert "2026-03-10T09:00:00" or "2026-03-10T09:00:00+00:00" to "2026-03-10T09:00"
  return isoString.substring(0, 16)
}

export function WorkEventEditForm({ clients, event }: WorkEventEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const clientOptions = clients.map((c) => ({ value: c.id, label: clientLabel(c) }))
  const eventTypeOptions = WORK_EVENT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))

  const handleSubmit = async (formData: FormData) => {
    setLoading(true)
    setError(null)
    setFieldErrors({})

    try {
      const title = formData.get('title') as string
      const clientId = formData.get('client_id') as string
      const eventType = formData.get('event_type') as string
      const scheduledStart = formData.get('scheduled_start') as string
      const scheduledEnd = formData.get('scheduled_end') as string
      const address = (formData.get('address') as string) || null
      const notes = (formData.get('notes') as string) || null
      const status = formData.get('status') as string

      const ensureSeconds = (dt: string) => (dt.length === 16 ? `${dt}:00` : dt)

      const payload = {
        title,
        client_id: clientId || null,
        event_type: eventType,
        scheduled_start: ensureSeconds(scheduledStart),
        scheduled_end: ensureSeconds(scheduledEnd),
        address,
        notes,
        status,
      }

      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.fieldErrors && typeof data.fieldErrors === 'object') {
          setFieldErrors(data.fieldErrors as FieldErrors)
          setError(data.error || 'Por favor verifica los datos ingresados.')
        } else {
          setError(data.error || 'Error al actualizar evento')
        }
        setLoading(false)
        return
      }

      router.push('/dashboard/calendar')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este evento?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/calendar/events/${event.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Error al eliminar evento')
        setLoading(false)
        return
      }

      router.push('/dashboard/calendar')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  const statusOptions = [
    { value: 'programado', label: 'Programado' },
    { value: 'en_progreso', label: 'En progreso' },
    { value: 'completado', label: 'Completado' },
    { value: 'cancelado', label: 'Cancelado' },
  ]

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
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
          defaultValue={event.title}
          className={fieldErrors.title ? 'border-red-500 bg-red-50' : ''}
        />
        <FieldError message={fieldErrors.title} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_id">Cliente</Label>
        <Combobox
          id="client_id"
          name="client_id"
          options={clientOptions}
          defaultValue={event.client_id || ''}
          placeholder="Buscar cliente..."
          disabled={loading}
          fieldError={fieldErrors.client_id}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="event_type">Tipo de evento *</Label>
          <Combobox
            id="event_type"
            name="event_type"
            options={eventTypeOptions}
            defaultValue={event.event_type}
            placeholder="Buscar tipo..."
            required
            disabled={loading}
            fieldError={fieldErrors.event_type}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Estado *</Label>
          <Combobox
            id="status"
            name="status"
            options={statusOptions}
            defaultValue={event.status}
            placeholder="Estado..."
            required
            disabled={loading}
            fieldError={fieldErrors.status}
          />
        </div>
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
            defaultValue={toLocalDatetimeInput(event.scheduled_start)}
            className={fieldErrors.scheduled_start ? 'border-red-500 bg-red-50' : ''}
          />
          <FieldError message={fieldErrors.scheduled_start} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="scheduled_end">Fecha y hora fin *</Label>
          <Input
            id="scheduled_end"
            name="scheduled_end"
            type="datetime-local"
            required
            disabled={loading}
            defaultValue={toLocalDatetimeInput(event.scheduled_end)}
            className={fieldErrors.scheduled_end ? 'border-red-500 bg-red-50' : ''}
          />
          <FieldError message={fieldErrors.scheduled_end} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          name="address"
          type="text"
          placeholder="Dirección del servicio"
          disabled={loading}
          maxLength={500}
          defaultValue={event.address || ''}
          className={fieldErrors.address ? 'border-red-500 bg-red-50' : ''}
        />
        <FieldError message={fieldErrors.address} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Notas adicionales sobre el evento"
          disabled={loading}
          maxLength={1000}
          rows={4}
          defaultValue={event.notes || ''}
          className={fieldErrors.notes ? 'border-red-500 bg-red-50' : ''}
        />
        <FieldError message={fieldErrors.notes} />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => router.back()}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={handleDelete}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          Eliminar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
