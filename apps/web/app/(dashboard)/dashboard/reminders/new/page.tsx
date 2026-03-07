'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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
        className={`w-full px-3 py-2 border rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 ${
          hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
        }`}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg text-sm">
          {filtered.map((o) => (
            <li
              key={o.value}
              onMouseDown={() => selectOption(o.value, o.label)}
              className={`px-3 py-2 cursor-pointer hover:bg-orange-50 ${
                o.value === selectedValue ? 'bg-orange-100 font-medium' : ''
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

interface Client {
  id: string
  name: string
  company_name: string | null
}

export default function NewReminderPage() {
  const router = useRouter()
  const { toast } = useToast()
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
          setClients(data.clients || [])
        }
      } catch (err) {
        console.error('Error loading clients:', err)
      }
    }

    fetchClients()
  }, [])

  function validateFields(clientId: string, title: string): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!clientId) errors.client_id = 'Selecciona un cliente'
    if (!title || title.trim().length === 0) errors.title = 'El título es requerido'
    return errors
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const clientId = formData.get('client_id') as string
    const title = formData.get('title') as string

    const errors = validateFields(clientId, title)
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0])
      return
    }

    setLoading(true)

    const data = {
      client_id: clientId,
      title: formData.get('title'),
      description: formData.get('description'),
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

      toast({ message: 'Recordatorio creado exitosamente', variant: 'success' })
      router.push('/dashboard/reminders')
      router.refresh()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al crear recordatorio'
      setError(errorMsg)
      toast({ message: errorMsg, variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Compact header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/reminders">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Recordatorio</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Programa un recordatorio de seguimiento</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Client Selection */}
          <FormField label="Cliente *" htmlFor="client_id">
            <Combobox
              id="client_id"
              name="client_id"
              options={clients.map(client => ({
                value: client.id,
                label: `${client.name} ${client.company_name ? `(${client.company_name})` : ''}`
              }))}
              placeholder="Selecciona un cliente..."
              required
            />
          </FormField>
          {clients.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No hay clientes. <Link href="/dashboard/clients/new" className="text-orange-600 dark:text-orange-400 hover:underline">Crear cliente</Link>
            </p>
          )}

          <FormField label="Título *" htmlFor="title">
            <Input id="title" name="title" required placeholder="Mantenimiento anual de minisplit" />
          </FormField>

          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Tipo *" htmlFor="reminder_type">
              <Combobox
                id="reminder_type"
                name="reminder_type"
                options={[
                  { value: 'follow_up', label: 'Seguimiento' },
                  { value: 'maintenance', label: 'Mantenimiento' },
                  { value: 'renewal', label: 'Renovación' },
                  { value: 'custom', label: 'Personalizado' }
                ]}
                placeholder="Selecciona un tipo..."
                required
              />
            </FormField>

            <FormField label="Prioridad *" htmlFor="priority">
              <Combobox
                id="priority"
                name="priority"
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'low', label: 'Baja' },
                  { value: 'high', label: 'Alta' },
                  { value: 'urgent', label: 'Urgente' }
                ]}
                placeholder="Selecciona una prioridad..."
                required
              />
            </FormField>

            <FormField label="Fecha Programada *" htmlFor="scheduled_date">
              <Input
                id="scheduled_date"
                name="scheduled_date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
                min={new Date().toISOString().split('T')[0]}
              />
            </FormField>

            <FormField label="Categoría de Servicio" htmlFor="related_service_category">
              <Combobox
                id="related_service_category"
                name="related_service_category"
                options={[
                  { value: '', label: 'Ninguna' },
                  { value: 'hvac', label: 'HVAC' },
                  { value: 'painting', label: 'Pintura' },
                  { value: 'plumbing', label: 'Plomería' },
                  { value: 'electrical', label: 'Eléctrico' },
                  { value: 'other', label: 'Otro' }
                ]}
                placeholder="Selecciona una categoría..."
              />
            </FormField>
          </div>

          <FormField label="Mensaje" htmlFor="description" hint="Se enviará al cliente en la fecha programada">
            <Textarea
              id="description"
              name="description"
              rows={2}
              placeholder="Hola, es momento de programar el mantenimiento anual..."
            />
          </FormField>

          {/* Recurring */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="h-4 w-4 accent-orange-500 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
              />
              <Label htmlFor="is_recurring" className="text-sm dark:text-gray-300 cursor-pointer">
                Recurrente
              </Label>
            </div>
            {isRecurring && (
              <div className="flex items-center gap-2">
                <Label htmlFor="recurrence_interval_months" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  Cada
                </Label>
                <Input
                  id="recurrence_interval_months"
                  name="recurrence_interval_months"
                  type="number"
                  min="1"
                  max="36"
                  defaultValue="12"
                  required={isRecurring}
                  className="w-20"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">meses</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Link href="/dashboard/reminders" className="flex-1">
              <Button type="button" variant="outline" size="sm" disabled={loading} className="w-full">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" size="sm" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? 'Creando...' : 'Crear Recordatorio'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
