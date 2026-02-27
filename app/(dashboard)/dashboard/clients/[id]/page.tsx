'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { ArrowLeft, Trash2, Save } from 'lucide-react'
import Link from 'next/link'
import { DynamicFieldsSection } from '@/components/forms/DynamicFieldsSection'
import type { CustomFieldValues } from '@/types/custom-fields'

interface Client {
  id: string
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  tags: string[] | null
  created_at: string
  custom_fields?: CustomFieldValues
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const clientId = resolvedParams.id

  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [client, setClient] = useState<Client | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [customFields, setCustomFields] = useState<CustomFieldValues>({})

  useEffect(() => {
    async function fetchClient() {
      try {
        const response = await fetch(`/api/clients/${clientId}`)
        if (response.ok) {
          const data = await response.json()
          setClient(data.client)
          setCustomFields((data.client.custom_fields as CustomFieldValues) ?? {})
        } else {
          setError('Cliente no encontrado')
        }
      } catch {
        setError('Error al cargar cliente')
      }
    }

    fetchClient()
  }, [clientId])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const tags = formData.get('tags') as string

    const data = {
      name: formData.get('name'),
      company_name: formData.get('company_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      notes: formData.get('notes'),
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      custom_fields: customFields,
    }

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al actualizar cliente')
      }

      const updated = await response.json()
      setClient(updated.client)
      setIsEditing(false)
      router.push('/dashboard/clients')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar cliente')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Estas seguro de eliminar este cliente? Esta accion no se puede deshacer.')) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar cliente')
      }

      router.push('/dashboard/clients')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar cliente')
      setDeleting(false)
    }
  }

  if (error && !client) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-semibold text-sm">Error</p>
          <p className="text-gray-500 text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{client.name}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{client.company_name || 'Sin empresa'}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                Editar
              </Button>
              <Button onClick={handleDelete} variant="destructive" size="sm" disabled={deleting}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {deleting ? 'Eliminando...' : 'Eliminar'}
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

      {/* Content */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Informacion del Cliente</span>
        </div>
        <div className="p-4">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Nombre Completo" htmlFor="name" required>
                  <Input id="name" name="name" required defaultValue={client.name} />
                </FormField>

                <FormField label="Empresa" htmlFor="company_name">
                  <Input id="company_name" name="company_name" defaultValue={client.company_name || ''} />
                </FormField>

                <FormField label="Email" htmlFor="email">
                  <Input id="email" name="email" type="email" defaultValue={client.email || ''} />
                </FormField>

                <FormField label="Telefono" htmlFor="phone">
                  <Input id="phone" name="phone" type="tel" defaultValue={client.phone || ''} />
                </FormField>
              </div>

              <FormField label="Direccion" htmlFor="address">
                <Textarea id="address" name="address" rows={2} defaultValue={client.address || ''} />
              </FormField>

              <FormField label="Etiquetas" htmlFor="tags" hint="Separa las etiquetas con comas">
                <Input
                  id="tags"
                  name="tags"
                  placeholder="HVAC, Mantenimiento, VIP"
                  defaultValue={client.tags?.join(', ') || ''}
                />
              </FormField>

              <FormField label="Notas" htmlFor="notes">
                <Textarea id="notes" name="notes" rows={2} defaultValue={client.notes || ''} />
              </FormField>

              <DynamicFieldsSection
                entityType="client"
                values={customFields}
                onChange={setCustomFields}
              />

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
                  <p className="text-xs text-gray-500 dark:text-gray-400">Nombre</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{client.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Empresa</p>
                  <p className="text-sm text-gray-900 dark:text-white">{client.company_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-sm text-gray-900 dark:text-white">{client.email || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Telefono</p>
                  <p className="text-sm text-gray-900 dark:text-white">{client.phone || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Direccion</p>
                <p className="text-sm text-gray-900 dark:text-white">{client.address || '-'}</p>
              </div>

              {client.tags && client.tags.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Etiquetas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {client.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-[10px] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {client.notes && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Notas</p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Creado</p>
                <p className="text-sm text-gray-900 dark:text-white">
                  {new Date(client.created_at).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <DynamicFieldsSection
                entityType="client"
                values={customFields}
                onChange={() => {}}
                disabled
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
