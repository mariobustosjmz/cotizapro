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

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customFields, setCustomFields] = useState<CustomFieldValues>({})

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
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear cliente')
      }

      router.push('/dashboard/clients')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear cliente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/clients">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Nuevo Cliente</h2>
          <p className="text-gray-600">Agrega un nuevo cliente a tu cartera</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <FormField label="Nombre Completo" htmlFor="name" required>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Juan Pérez"
                />
              </FormField>

              <FormField label="Empresa" htmlFor="company_name">
                <Input
                  id="company_name"
                  name="company_name"
                  placeholder="Empresa SA de CV"
                />
              </FormField>

              <FormField label="Email" htmlFor="email">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="juan@ejemplo.com"
                />
              </FormField>

              <FormField label="Teléfono" htmlFor="phone">
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="5512345678"
                />
              </FormField>
            </div>

            <FormField label="Dirección" htmlFor="address">
              <Textarea
                id="address"
                name="address"
                rows={3}
                placeholder="Calle, número, colonia, ciudad, estado, CP"
              />
            </FormField>

            <FormField label="Etiquetas" htmlFor="tags" hint="Separa las etiquetas con comas">
              <Input
                id="tags"
                name="tags"
                placeholder="HVAC, Mantenimiento, VIP (separadas por comas)"
              />
            </FormField>

            <FormField label="Notas" htmlFor="notes">
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="Información adicional sobre el cliente..."
              />
            </FormField>

            <DynamicFieldsSection
              entityType="client"
              values={customFields}
              onChange={setCustomFields}
            />

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Link href="/dashboard/clients">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
                {loading ? 'Creando...' : 'Crear Cliente'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
