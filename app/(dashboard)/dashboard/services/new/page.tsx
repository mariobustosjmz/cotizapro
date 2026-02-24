'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DynamicFieldsSection } from '@/components/forms/DynamicFieldsSection'
import type { CustomFieldValues } from '@/types/custom-fields'

export default function NewServicePage() {
  const router = useRouter()
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

      router.push('/dashboard/services')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear servicio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/services">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nuevo Servicio</h2>
          <p className="text-gray-600">Agrega un servicio a tu catálogo</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Nombre del Servicio" htmlFor="name" required className="md:col-span-2">
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Instalación de minisplit 12000 BTU"
                />
              </FormField>

              <FormField label="Categoría" htmlFor="category" required>
                <select
                  id="category"
                  name="category"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selecciona una categoría...</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Selecciona una unidad...</option>
                  <option value="fixed">Precio Fijo</option>
                  <option value="per_hour">Por Hora</option>
                  <option value="per_sqm">Por Metro Cuadrado (m²)</option>
                  <option value="per_unit">Por Unidad</option>
                </select>
              </FormField>

              <FormField
                label="Precio Base"
                htmlFor="unit_price"
                required
                hint="Precio predeterminado para este servicio"
              >
                <Input
                  id="unit_price"
                  name="unit_price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                />
              </FormField>

              <FormField
                label="Estado"
                htmlFor="is_active"
                required
                hint="Los servicios inactivos no aparecen en las cotizaciones"
              >
                <select
                  id="is_active"
                  name="is_active"
                  required
                  defaultValue="true"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              </FormField>
            </div>

            <FormField label="Descripción" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Detalles del servicio, incluye materiales, garantía, etc."
              />
            </FormField>

            <DynamicFieldsSection
              entityType="service"
              values={customFields}
              onChange={setCustomFields}
            />

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/services">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
                {loading ? 'Creando...' : 'Crear Servicio'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
