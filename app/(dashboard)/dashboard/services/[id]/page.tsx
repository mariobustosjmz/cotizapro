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

interface Service {
  id: string
  name: string
  description: string | null
  category: string
  unit_price: number
  unit_type: string
  is_active: boolean
  created_at: string
  custom_fields?: CustomFieldValues
}

export default function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [service, setService] = useState<Service | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [customFields, setCustomFields] = useState<CustomFieldValues>({})

  useEffect(() => {
    async function fetchService() {
      try {
        const response = await fetch(`/api/services/${id}`)
        if (response.ok) {
          const data = await response.json()
          setService(data.data)
          setCustomFields((data.data.custom_fields as CustomFieldValues) ?? {})
        } else {
          setError('Servicio no encontrado')
        }
      } catch (err) {
        setError('Error al cargar servicio')
      }
    }

    fetchService()
  }, [id])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      unit_price: parseFloat(formData.get('unit_price') as string),
      unit_type: formData.get('unit_type'),
      is_active: formData.get('is_active') === 'true',
      custom_fields: customFields,
    }

    try {
      const response = await fetch(`/api/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al actualizar servicio')
      }

      const updated = await response.json()
      setService(updated.data)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar servicio')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('¿Estás seguro de eliminar este servicio? Esta acción no se puede deshacer.')) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar servicio')
      }

      router.push('/dashboard/services')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar servicio')
      setDeleting(false)
    }
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  const categoryLabels: Record<string, string> = {
    hvac: 'HVAC',
    painting: 'Pintura',
    plumbing: 'Plomería',
    electrical: 'Eléctrico',
    other: 'Otros'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/services">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-bold text-gray-900">{service.name}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                service.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {service.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-gray-600">{categoryLabels[service.category]}</p>
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
          <CardTitle>Información del Servicio</CardTitle>
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
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Nombre del Servicio *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={service.name}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría *</Label>
                  <select
                    id="category"
                    name="category"
                    required
                    defaultValue={service.category}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="hvac">HVAC</option>
                    <option value="painting">Pintura</option>
                    <option value="plumbing">Plomería</option>
                    <option value="electrical">Eléctrico</option>
                    <option value="other">Otros</option>
                  </select>
                </div>

                {/* Unit Type */}
                <div className="space-y-2">
                  <Label htmlFor="unit_type">Unidad de Medida *</Label>
                  <select
                    id="unit_type"
                    name="unit_type"
                    required
                    defaultValue={service.unit_type}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fixed">Precio Fijo</option>
                    <option value="per_hour">Por Hora</option>
                    <option value="per_sqm">Por Metro Cuadrado (m²)</option>
                    <option value="per_unit">Por Unidad</option>
                  </select>
                </div>

                {/* Default Price */}
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Precio Base *</Label>
                  <Input
                    id="unit_price"
                    name="unit_price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    defaultValue={service.unit_price}
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="is_active">Estado *</Label>
                  <select
                    id="is_active"
                    name="is_active"
                    required
                    defaultValue={service.is_active ? 'true' : 'false'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                  <p className="text-sm text-gray-500">
                    Los servicios inactivos no aparecen en las cotizaciones
                  </p>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={4}
                  defaultValue={service.description || ''}
                />
              </div>

              <DynamicFieldsSection
                entityType="service"
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
                  <p className="text-gray-900 font-medium">{service.name}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Categoría</Label>
                  <p className="text-gray-900">{categoryLabels[service.category]}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Precio Base</Label>
                  <p className="text-gray-900 text-xl font-bold">
                    ${Number(service.unit_price).toLocaleString('es-MX')}
                  </p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Unidad de Medida</Label>
                  <p className="text-gray-900">{service.unit_type}</p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Estado</Label>
                  <p className="text-gray-900">
                    {service.is_active ? 'Activo' : 'Inactivo'}
                  </p>
                </div>

                <div>
                  <Label className="text-sm text-gray-500">Fecha de Creación</Label>
                  <p className="text-gray-900">
                    {new Date(service.created_at).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {service.description && (
                <div>
                  <Label className="text-sm text-gray-500">Descripción</Label>
                  <p className="text-gray-900 whitespace-pre-wrap">{service.description}</p>
                </div>
              )}

              <DynamicFieldsSection
                entityType="service"
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
