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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
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
      } catch {
        setError('Error al cargar servicio')
      }
    }

    fetchService()
  }, [id])

  function validateFields(data: Record<string, unknown>): Record<string, string> {
    const errors: Record<string, string> = {}
    if (!data.name || (data.name as string).trim().length === 0) {
      errors.name = 'El nombre es requerido'
    }
    const price = data.unit_price as number
    if (isNaN(price) || price < 0) {
      errors.unit_price = 'El precio debe ser mayor o igual a 0'
    }
    return errors
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setFieldErrors({})

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

    const errors = validateFields(data as Record<string, unknown>)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/services/${id}`, {
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
        throw new Error(errorData.error || 'Error al actualizar servicio')
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
    if (!confirm('Estas seguro de eliminar este servicio? Esta accion no se puede deshacer.')) {
      return
    }

    setDeleting(true)
    setError('')

    try {
      const response = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al eliminar servicio')
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
        <p className="text-gray-500 text-sm">Cargando...</p>
      </div>
    )
  }

  const categoryLabels: Record<string, string> = {
    hvac: 'HVAC',
    painting: 'Pintura',
    plumbing: 'Plomeria',
    electrical: 'Electrico',
    other: 'Otros'
  }

  const unitTypeLabels: Record<string, string> = {
    fixed: 'Fijo',
    per_hour: 'Por Hora',
    per_sqm: 'Por m\u00B2',
    per_unit: 'Por Unidad',
  }

  const selectClass = 'w-full px-3 py-2 bg-white dark:bg-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/services">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{service.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                service.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}>
                {service.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{categoryLabels[service.category]}</p>
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
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Informacion del Servicio</span>
        </div>
        <div className="p-4">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField label="Nombre del Servicio" htmlFor="name" required error={fieldErrors.name}>
                <Input id="name" name="name" required defaultValue={service.name} className={fieldErrors.name ? 'border-red-500' : ''} />
              </FormField>

              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Categoria" htmlFor="category" required>
                  <select id="category" name="category" required defaultValue={service.category} className={selectClass}>
                    <option value="hvac">HVAC</option>
                    <option value="painting">Pintura</option>
                    <option value="plumbing">Plomeria</option>
                    <option value="electrical">Electrico</option>
                    <option value="other">Otros</option>
                  </select>
                </FormField>

                <FormField label="Unidad de Medida" htmlFor="unit_type" required>
                  <select id="unit_type" name="unit_type" required defaultValue={service.unit_type} className={selectClass}>
                    <option value="fixed">Precio Fijo</option>
                    <option value="per_hour">Por Hora</option>
                    <option value="per_sqm">Por Metro Cuadrado (m&#178;)</option>
                    <option value="per_unit">Por Unidad</option>
                  </select>
                </FormField>

                <FormField label="Precio Base" htmlFor="unit_price" required error={fieldErrors.unit_price}>
                  <Input id="unit_price" name="unit_price" type="number" min="0" step="0.01" required defaultValue={service.unit_price} className={fieldErrors.unit_price ? 'border-red-500' : ''} />
                </FormField>

                <FormField label="Estado" htmlFor="is_active" required hint="Los servicios inactivos no aparecen en las cotizaciones">
                  <select id="is_active" name="is_active" required defaultValue={service.is_active ? 'true' : 'false'} className={selectClass}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </FormField>
              </div>

              <FormField label="Descripcion" htmlFor="description">
                <Textarea id="description" name="description" rows={2} defaultValue={service.description || ''} />
              </FormField>

              <DynamicFieldsSection
                entityType="service"
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
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{service.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Categoria</p>
                  <p className="text-sm text-gray-900 dark:text-white">{categoryLabels[service.category]}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Precio Base</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${Number(service.unit_price).toLocaleString('es-MX')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Unidad de Medida</p>
                  <p className="text-sm text-gray-900 dark:text-white">{unitTypeLabels[service.unit_type] || service.unit_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Estado</p>
                  <p className="text-sm text-gray-900 dark:text-white">{service.is_active ? 'Activo' : 'Inactivo'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Creado</p>
                  <p className="text-sm text-gray-900 dark:text-white">
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">Descripcion</p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{service.description}</p>
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
        </div>
      </div>
    </div>
  )
}
