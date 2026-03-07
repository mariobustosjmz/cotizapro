'use client'

import { useState, useRef } from 'react'
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

interface ComboboxProps {
  id: string
  name: string
  options: { value: string; label: string }[]
  defaultValue?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  fieldError?: string
}

function Combobox({ id, name, options, defaultValue = '', placeholder, required, disabled, fieldError }: ComboboxProps) {
  const defaultOption = options.find((o) => o.value === defaultValue)
  const [search, setSearch] = useState(defaultOption?.label ?? '')
  const [selectedValue, setSelectedValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  const selectOption = (value: string, label: string) => {
    setSelectedValue(value)
    setSearch(label)
    setOpen(false)
  }

  const hasError = Boolean(fieldError)

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} />
      <input
        id={id}
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value)
          setSelectedValue('')
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete="off"
        className={`w-full px-3 py-2 border rounded-md text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 ${
          hasError ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300'
        }`}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg text-sm dark:bg-gray-800 dark:border-gray-600">
          {filtered.map((o) => (
            <li
              key={o.value}
              onMouseDown={() => selectOption(o.value, o.label)}
              className={`px-3 py-2 cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20 ${
                o.value === selectedValue ? 'bg-orange-100 font-medium dark:bg-orange-900/40' : ''
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {hasError && (
        <p className="mt-1 text-xs text-red-600">{fieldError}</p>
      )}
    </div>
  )
}

export default function NewServicePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [customFields, setCustomFields] = useState<CustomFieldValues>({})

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
      const response = await fetch('/api/services', {
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
        throw new Error(data.error || 'Error al crear servicio')
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

          <FormField label="Nombre del Servicio" htmlFor="name" required error={fieldErrors.name}>
            <Input id="name" name="name" required placeholder="Instalación de minisplit 12000 BTU" className={fieldErrors.name ? 'border-red-500' : ''} />
          </FormField>

          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Categoría *" htmlFor="category" required error={fieldErrors.category}>
              <Combobox
                id="category"
                name="category"
                options={[
                  { value: 'hvac', label: 'HVAC' },
                  { value: 'painting', label: 'Pintura' },
                  { value: 'plumbing', label: 'Plomería' },
                  { value: 'electrical', label: 'Eléctrico' },
                  { value: 'other', label: 'Otros' },
                ]}
                placeholder="Selecciona una categoría..."
                required
                disabled={loading}
                fieldError={fieldErrors.category}
              />
            </FormField>

            <FormField label="Unidad de Medida *" htmlFor="unit_type" required error={fieldErrors.unit_type}>
              <Combobox
                id="unit_type"
                name="unit_type"
                options={[
                  { value: 'fixed', label: 'Precio Fijo' },
                  { value: 'per_hour', label: 'Por Hora' },
                  { value: 'per_sqm', label: 'Por m²' },
                  { value: 'per_unit', label: 'Por Unidad' },
                ]}
                placeholder="Selecciona una unidad..."
                required
                disabled={loading}
                fieldError={fieldErrors.unit_type}
              />
            </FormField>

            <FormField label="Precio Base *" htmlFor="unit_price" required hint="Precio predeterminado" error={fieldErrors.unit_price}>
              <Input id="unit_price" name="unit_price" type="number" min="0" step="0.01" required placeholder="0.00" className={fieldErrors.unit_price ? 'border-red-500' : ''} />
            </FormField>

            <FormField label="Estado *" htmlFor="is_active" required hint="Inactivos no aparecen en cotizaciones" error={fieldErrors.is_active}>
              <Combobox
                id="is_active"
                name="is_active"
                options={[
                  { value: 'true', label: 'Activo' },
                  { value: 'false', label: 'Inactivo' },
                ]}
                placeholder="Selecciona un estado..."
                defaultValue="true"
                required
                disabled={loading}
                fieldError={fieldErrors.is_active}
              />
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
          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Link href="/dashboard/services" className="flex-1">
              <Button type="button" variant="outline" size="sm" disabled={loading} className="w-full">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" size="sm" disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white">
              {loading ? 'Creando...' : 'Crear Servicio'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
