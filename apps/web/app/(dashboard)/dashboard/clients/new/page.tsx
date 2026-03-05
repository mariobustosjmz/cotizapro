'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/ui/form-field'
import { ArrowLeft, User, Building, Mail, Phone, MapPin, Tag, FileText } from 'lucide-react'
import Link from 'next/link'
import { DynamicFieldsSection } from '@/components/forms/DynamicFieldsSection'
import type { CustomFieldValues } from '@/types/custom-fields'

export default function NewClientPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [customFields, setCustomFields] = useState<CustomFieldValues>({})

  function validateFields(data: Record<string, unknown>): Record<string, string> {
    const errors: Record<string, string> = {}
    const phone = data.phone as string | null
    const email = data.email as string | null

    if (!data.name || (data.name as string).trim().length === 0) {
      errors.name = 'El nombre es requerido'
    }
    if (phone && phone.trim().length > 0) {
      if (phone.trim().length < 10) errors.phone = 'Teléfono debe tener al menos 10 dígitos'
      else if (!/^[\d\s\-\+\(\)]+$/.test(phone)) errors.phone = 'Formato de teléfono inválido'
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
      address: formData.get('address'),
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
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const data = await response.json()
        if (data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
          setFieldErrors(data.fieldErrors)
          setError('Por favor corrige los errores marcados.')
          return
        }
        throw new Error(data.error || 'Error al crear cliente')
      }

      toast({ message: 'Cliente creado exitosamente', variant: 'success' })
      router.push('/dashboard/clients')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error al crear cliente'
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
        <Link href="/dashboard/clients">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nuevo Cliente</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Agrega un nuevo cliente a tu cartera</p>
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

          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Nombre Completo" htmlFor="name" required error={fieldErrors.name}>
              <Input id="name" name="name" required placeholder="Juan Pérez" className={fieldErrors.name ? 'border-red-500' : ''} />
            </FormField>

            <FormField label="Empresa" htmlFor="company_name">
              <Input id="company_name" name="company_name" placeholder="Empresa SA de CV" />
            </FormField>

            <FormField label="Email" htmlFor="email" error={fieldErrors.email}>
              <Input id="email" name="email" type="email" placeholder="juan@ejemplo.com" className={fieldErrors.email ? 'border-red-500' : ''} />
            </FormField>

            <FormField label="Teléfono" htmlFor="phone" error={fieldErrors.phone} hint="Mínimo 10 dígitos">
              <Input id="phone" name="phone" type="tel" placeholder="5512345678" className={fieldErrors.phone ? 'border-red-500' : ''} />
            </FormField>
          </div>

          <FormField label="Dirección" htmlFor="address">
            <Textarea id="address" name="address" rows={2} placeholder="Calle, número, colonia, ciudad, estado, CP" />
          </FormField>

          <FormField label="Etiquetas" htmlFor="tags" hint="Separa con comas">
            <Input id="tags" name="tags" placeholder="HVAC, Mantenimiento, VIP" />
          </FormField>

          <FormField label="Notas" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={2} placeholder="Información adicional sobre el cliente..." />
          </FormField>

          <DynamicFieldsSection
            entityType="client"
            values={customFields}
            onChange={setCustomFields}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Link href="/dashboard/clients">
              <Button type="button" variant="outline" size="sm" disabled={loading}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" size="sm" disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? 'Creando...' : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
