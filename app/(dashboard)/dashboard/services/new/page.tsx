'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DynamicFieldsSection } from '@/components/forms/DynamicFieldsSection'
import type { CustomFieldValues } from '@/types/custom-fields'

export default function NewServicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customFields, setCustomFields] = useState<CustomFieldValues>({})

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
      const response = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear servicio')
      }

      toast({ message: 'Servicio creado exitosamente', variant: 'success' })
      router.push('/dashboard/services')
      router.refresh()
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al crear servicio'
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
        <Link href="/dashboard/services">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Servicio</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Agrega un servicio a tu catálogo</p>
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

          <FormField label="Nombre del Servicio" htmlFor="name" required>
            <Input id="name" name="name" required placeholder="Instalación de minisplit 12000 BTU" />
          </FormField>

          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Categoría" htmlFor="category" required>
              <select
                id="category"
                name="category"
                required
                className="w-full h-9 px-3 text-sm bg-white dark:bg-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                <option value="">Selecciona...</option>
                <option value="hvac">HVAC</option>
                <option value="painting">Pintura</option>
                <option value="plumbing">Plomería</option>
                <option value="electrical">Eléctrico</option>
                <option value="other">Otros</option>
              </select>
            </FormField>

            <FormField label="Unidad de Medida" htmlFor="unit_type" required>
              <select
                id="unit_type"
                name="unit_type"
                required
                className="w-full h-9 px-3 text-sm bg-white dark:bg-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                <option value="">Selecciona...</option>
                <option value="fixed">Precio Fijo</option>
                <option value="per_hour">Por Hora</option>
                <option value="per_sqm">Por m²</option>
                <option value="per_unit">Por Unidad</option>
              </select>
            </FormField>

            <FormField label="Precio Base" htmlFor="unit_price" required hint="Precio predeterminado">
              <Input id="unit_price" name="unit_price" type="number" min="0" step="0.01" required placeholder="0.00" />
            </FormField>

            <FormField label="Estado" htmlFor="is_active" required hint="Inactivos no aparecen en cotizaciones">
              <select
                id="is_active"
                name="is_active"
                required
                defaultValue="true"
                className="w-full h-9 px-3 text-sm bg-white dark:bg-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </FormField>
          </div>

          <FormField label="Descripción" htmlFor="description">
            <Textarea id="description" name="description" rows={2} placeholder="Detalles del servicio, materiales, garantía, etc." />
          </FormField>

          <DynamicFieldsSection
            entityType="service"
            values={customFields}
            onChange={setCustomFields}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Link href="/dashboard/services">
              <Button type="button" variant="outline" size="sm" disabled={loading}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" size="sm" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? 'Creando...' : 'Crear Servicio'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
