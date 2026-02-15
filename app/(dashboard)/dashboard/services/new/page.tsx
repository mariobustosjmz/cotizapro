'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewServicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      default_price: parseFloat(formData.get('default_price') as string),
      unit_type: formData.get('unit_type'),
      is_active: formData.get('is_active') === 'true',
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
              {/* Name */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">Nombre del Servicio *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Instalación de minisplit 12000 BTU"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <select
                  id="category"
                  name="category"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona una categoría...</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona una unidad...</option>
                  <option value="servicio">Servicio</option>
                  <option value="hora">Hora</option>
                  <option value="m2">Metro cuadrado (m²)</option>
                  <option value="m">Metro (m)</option>
                  <option value="pieza">Pieza</option>
                  <option value="paquete">Paquete</option>
                  <option value="proyecto">Proyecto</option>
                </select>
              </div>

              {/* Default Price */}
              <div className="space-y-2">
                <Label htmlFor="default_price">Precio Base *</Label>
                <Input
                  id="default_price"
                  name="default_price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                />
                <p className="text-sm text-gray-500">
                  Precio predeterminado para este servicio
                </p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="is_active">Estado *</Label>
                <select
                  id="is_active"
                  name="is_active"
                  required
                  defaultValue="true"
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
                placeholder="Detalles del servicio, incluye materiales, garantía, etc."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/services">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Servicio'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
