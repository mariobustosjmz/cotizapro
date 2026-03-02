'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

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

  const selectClass = "w-full h-9 px-3 text-sm bg-white dark:bg-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"

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
          <FormField label="Cliente" htmlFor="client_id" required>
            <select id="client_id" name="client_id" required className={selectClass}>
              <option value="">Selecciona un cliente...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.company_name ? `(${client.company_name})` : ''}
                </option>
              ))}
            </select>
          </FormField>
          {clients.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No hay clientes. <Link href="/dashboard/clients/new" className="text-orange-600 dark:text-orange-400 hover:underline">Crear cliente</Link>
            </p>
          )}

          <FormField label="Título" htmlFor="title" required>
            <Input id="title" name="title" required placeholder="Mantenimiento anual de minisplit" />
          </FormField>

          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Tipo" htmlFor="reminder_type" required>
              <select id="reminder_type" name="reminder_type" required className={selectClass}>
                <option value="follow_up">Seguimiento</option>
                <option value="maintenance">Mantenimiento</option>
                <option value="renewal">Renovación</option>
                <option value="custom">Personalizado</option>
              </select>
            </FormField>

            <FormField label="Prioridad" htmlFor="priority" required>
              <select id="priority" name="priority" required className={selectClass}>
                <option value="normal">Normal</option>
                <option value="low">Baja</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </FormField>

            <FormField label="Fecha Programada" htmlFor="scheduled_date" required>
              <Input
                id="scheduled_date"
                name="scheduled_date"
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </FormField>

            <FormField label="Categoría de Servicio" htmlFor="related_service_category">
              <select id="related_service_category" name="related_service_category" className={selectClass}>
                <option value="">Ninguna</option>
                <option value="hvac">HVAC</option>
                <option value="painting">Pintura</option>
                <option value="plumbing">Plomería</option>
                <option value="electrical">Eléctrico</option>
                <option value="other">Otro</option>
              </select>
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
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Link href="/dashboard/reminders">
              <Button type="button" variant="outline" size="sm" disabled={loading}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" size="sm" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? 'Creando...' : 'Crear Recordatorio'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
