'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
      } catch (err) {
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
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar cliente')
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
    if (!confirm('¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.')) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar cliente')
      }

      router.push('/dashboard/clients')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar cliente')
      setDeleting(false)
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Error</p>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/clients">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
            <p className="text-gray-600">{client.company_name || 'Sin empresa'}</p>
          </div>
        </div>

        <div className="flex space-x-2">
          {!isEditing ? (
            <>
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
              >
                Editar
              </Button>
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
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={client.name}
                  />
                </div>

                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="company_name">Empresa (Opcional)</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    defaultValue={client.company_name || ''}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={client.email || ''}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={client.phone || ''}
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Textarea
                  id="address"
                  name="address"
                  rows={3}
                  defaultValue={client.address || ''}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Etiquetas</Label>
                <Input
                  id="tags"
                  name="tags"
                  placeholder="HVAC, Mantenimiento, VIP (separadas por comas)"
                  defaultValue={client.tags?.join(', ') || ''}
                />
                <p className="text-sm text-gray-500">
                  Separa las etiquetas con comas
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  defaultValue={client.notes || ''}
                />
              </div>

              <DynamicFieldsSection
                entityType="client"
                values={customFields}
                onChange={setCustomFields}
              />

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
                  <Label className="text-sm text-gray-500">Nombre</Label>
                  <p className="text-gray-900 font-medium">{client.name}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Empresa</Label>
                  <p className="text-gray-900">{client.company_name || '-'}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Email</Label>
                  <p className="text-gray-900">{client.email || '-'}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Teléfono</Label>
                  <p className="text-gray-900">{client.phone || '-'}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-500">Dirección</Label>
                <p className="text-gray-900">{client.address || '-'}</p>
              </div>

              {client.tags && client.tags.length > 0 && (
                <div>
                  <Label className="text-sm text-gray-500">Etiquetas</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {client.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {client.notes && (
                <div>
                  <Label className="text-sm text-gray-500">Notas</Label>
                  <p className="text-gray-900 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}

              <div>
                <Label className="text-sm text-gray-500">Fecha de Creación</Label>
                <p className="text-gray-900">
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
        </CardContent>
      </Card>
    </div>
  )
}
