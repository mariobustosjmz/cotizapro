'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
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
  whatsapp_phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  notes: string | null
  tags: string[] | null
  created_at: string
  custom_fields?: CustomFieldValues
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = use(params)
  const clientId = resolvedParams.id

  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
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

  function validateFields(data: Record<string, unknown>): Record<string, string> {
    const errors: Record<string, string> = {}
    const phone = data.phone as string | null
    const whatsapp = data.whatsapp_phone as string | null
    const email = data.email as string | null
    if (!data.name || (data.name as string).trim().length === 0) {
      errors.name = 'El nombre es requerido'
    }
    if (phone && phone.trim().length > 0) {
      if (phone.trim().length < 10) errors.phone = 'Teléfono debe tener al menos 10 dígitos'
      else if (!/^[\d\s\-\+\(\)]+$/.test(phone)) errors.phone = 'Formato de teléfono inválido'
    }
    if (whatsapp && whatsapp.trim().length > 0) {
      if (whatsapp.trim().length < 10) errors.whatsapp_phone = 'WhatsApp debe tener al menos 10 dígitos'
      else if (!/^[\d\s\-\+\(\)]+$/.test(whatsapp)) errors.whatsapp_phone = 'Formato de WhatsApp inválido'
    }
    if (email && email.trim().length > 0) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Email inválido'
    }
    return errors
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const tags = formData.get('tags') as string

    const data = {
      name: formData.get('name'),
      company_name: formData.get('company_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      whatsapp_phone: formData.get('whatsapp_phone'),
      address: formData.get('address'),
      city: formData.get('city'),
      state: formData.get('state'),
      postal_code: formData.get('postal_code'),
      notes: formData.get('notes'),
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      custom_fields: customFields,
    }

    const errors = validateFields(data as Record<string, unknown>)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.fieldErrors && Object.keys(errorData.fieldErrors).length > 0) {
          setFieldErrors(errorData.fieldErrors)
          setError('Por favor corrige los errores marcados.')
          return
        }
        throw new Error(errorData.error || 'Error al actualizar cliente')
      }

      const updated = await response.json()
      setClient(updated.client)
      setIsEditing(false)
      toast({ message: 'Cliente actualizado exitosamente', variant: 'success' })
      router.push('/dashboard/clients')
      router.refresh()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al actualizar cliente'
      setError(errorMsg)
      toast({ message: errorMsg, variant: 'error' })
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

      toast({ message: 'Cliente eliminado exitosamente', variant: 'success' })
      router.push('/dashboard/clients')
      router.refresh()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al eliminar cliente'
      setError(errorMsg)
      toast({ message: errorMsg, variant: 'error' })
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
              {/* Contact Information */}
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Nombre Completo" htmlFor="name" required error={fieldErrors.name}>
                  <Input id="name" name="name" required defaultValue={client.name} className={fieldErrors.name ? 'border-red-500' : ''} />
                </FormField>

                <FormField label="Empresa" htmlFor="company_name">
                  <Input id="company_name" name="company_name" defaultValue={client.company_name || ''} />
                </FormField>

                <FormField label="Email" htmlFor="email" error={fieldErrors.email}>
                  <Input id="email" name="email" type="email" defaultValue={client.email || ''} className={fieldErrors.email ? 'border-red-500' : ''} />
                </FormField>

                <FormField label="Telefono" htmlFor="phone" required error={fieldErrors.phone}>
                  <Input id="phone" name="phone" type="tel" required defaultValue={client.phone || ''} className={fieldErrors.phone ? 'border-red-500' : ''} />
                </FormField>

                <FormField label="WhatsApp" htmlFor="whatsapp_phone" error={fieldErrors.whatsapp_phone}>
                  <Input id="whatsapp_phone" name="whatsapp_phone" type="tel" defaultValue={client.whatsapp_phone || ''} className={fieldErrors.whatsapp_phone ? 'border-red-500' : ''} />
                </FormField>
              </div>

              {/* Address Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Dirección</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <FormField label="Calle" htmlFor="address">
                    <Textarea id="address" name="address" rows={2} defaultValue={client.address || ''} />
                  </FormField>

                  <div className="grid gap-3">
                    <FormField label="Ciudad" htmlFor="city">
                      <Input id="city" name="city" defaultValue={client.city || ''} />
                    </FormField>

                    <FormField label="Estado" htmlFor="state">
                      <Input id="state" name="state" defaultValue={client.state || ''} />
                    </FormField>
                  </div>

                  <FormField label="Código Postal" htmlFor="postal_code">
                    <Input id="postal_code" name="postal_code" defaultValue={client.postal_code || ''} />
                  </FormField>
                </div>
              </div>

              {/* Tags and Notes */}
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Etiquetas" htmlFor="tags" hint="Separa con comas">
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
              </div>

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
            <div className="space-y-5">
              {/* Contact Information */}
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-3 uppercase tracking-wide">Información de Contacto</p>
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
                  {client.whatsapp_phone && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">WhatsApp</p>
                      <p className="text-sm text-gray-900 dark:text-white">{client.whatsapp_phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Address Information */}
              {(client.address || client.city || client.state || client.postal_code) && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-3 uppercase tracking-wide">Dirección</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {client.address && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Calle</p>
                        <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{client.address}</p>
                      </div>
                    )}
                    {client.city && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ciudad</p>
                        <p className="text-sm text-gray-900 dark:text-white">{client.city}</p>
                      </div>
                    )}
                    {client.state && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Estado</p>
                        <p className="text-sm text-gray-900 dark:text-white">{client.state}</p>
                      </div>
                    )}
                    {client.postal_code && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Código Postal</p>
                        <p className="text-sm text-gray-900 dark:text-white">{client.postal_code}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {client.tags && client.tags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">Etiquetas</p>
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

              {/* Notes */}
              {client.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wide">Notas</p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}

              {/* Created At */}
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
