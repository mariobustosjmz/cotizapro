'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import type { CustomFieldDefinition, FieldType } from '@/types/custom-fields'

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Numero',
  date: 'Fecha',
  select: 'Lista de opciones',
  checkbox: 'Checkbox',
  url: 'URL',
  phone: 'Telefono',
  email: 'Email',
}

interface SelectOption {
  value: string
  label: string
}

export default function EditCustomFieldPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [field, setField] = useState<CustomFieldDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [fieldLabel, setFieldLabel] = useState('')
  const [isRequired, setIsRequired] = useState(false)
  const [placeholder, setPlaceholder] = useState('')
  const [defaultValue, setDefaultValue] = useState('')
  const [options, setOptions] = useState<SelectOption[]>([])
  const [sortOrder, setSortOrder] = useState(0)

  useEffect(() => {
    async function loadField() {
      try {
        const res = await fetch(`/api/custom-fields/${id}`)
        if (!res.ok) throw new Error('Campo no encontrado')
        const json = await res.json()
        const f: CustomFieldDefinition = json.data
        setField(f)
        setFieldLabel(f.field_label)
        setIsRequired(f.is_required)
        setPlaceholder(f.placeholder ?? '')
        setDefaultValue(f.default_value ?? '')
        setOptions(f.options ?? [])
        setSortOrder(f.sort_order)
      } catch {
        setError('No se pudo cargar el campo.')
      } finally {
        setLoading(false)
      }
    }
    loadField()
  }, [id])

  function handleAddOption() {
    setOptions([...options, { value: '', label: '' }])
  }

  function handleRemoveOption(index: number) {
    setOptions(options.filter((_, i) => i !== index))
  }

  function handleOptionChange(index: number, key: 'value' | 'label', val: string) {
    setOptions(options.map((opt, i) => (i === index ? { ...opt, [key]: val } : opt)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const body: Record<string, unknown> = {
      field_label: fieldLabel,
      is_required: isRequired,
      placeholder: placeholder || null,
      default_value: defaultValue || null,
      sort_order: sortOrder,
    }

    if (field?.field_type === 'select') {
      body.options = options.filter((o) => o.value.trim() && o.label.trim())
    }

    try {
      const res = await fetch(`/api/custom-fields/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Error al guardar.')
        return
      }

      router.push('/dashboard/settings/custom-fields')
    } catch {
      setError('Error de conexion. Por favor intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="py-10 text-center text-sm text-gray-400">Cargando...</div>
  }

  if (!field) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error || 'Campo no encontrado.'}
        </div>
        <Link href="/dashboard/settings/custom-fields" className="text-xs font-medium text-orange-600 hover:text-orange-700">
          Volver a campos
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings/custom-fields">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Editar Campo</h2>
          <p className="text-xs text-gray-500">{field.field_key}</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200">
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
          )}

          {/* Read-only info */}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 text-sm">
            <div>
              <span className="text-xs font-medium text-gray-500">Identificador</span>
              <p className="font-mono text-gray-900">{field.field_key}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">Tipo</span>
              <p className="text-gray-900">{FIELD_TYPE_LABELS[field.field_type]}</p>
            </div>
          </div>

          <FormField label="Etiqueta" htmlFor="field_label" required>
            <Input
              id="field_label"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              required
            />
          </FormField>

          {/* Select options */}
          {field.field_type === 'select' && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Opciones</span>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={opt.value}
                      onChange={(e) => handleOptionChange(i, 'value', e.target.value)}
                      placeholder="valor"
                      className="flex-1"
                    />
                    <Input
                      value={opt.label}
                      onChange={(e) => handleOptionChange(i, 'label', e.target.value)}
                      placeholder="etiqueta"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(i)}
                      className="shrink-0 text-gray-400 hover:text-red-500 text-lg"
                      disabled={options.length === 1}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleAddOption}
                className="text-xs font-medium text-orange-600 hover:text-orange-700"
              >
                + Agregar opcion
              </button>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {/* Placeholder */}
            {field.field_type !== 'checkbox' && (
              <FormField label="Placeholder" htmlFor="placeholder" hint="Opcional">
                <Input
                  id="placeholder"
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                  placeholder="Texto de ayuda"
                />
              </FormField>
            )}

            {/* Default value */}
            {field.field_type !== 'checkbox' && field.field_type !== 'select' && (
              <FormField label="Valor por defecto" htmlFor="default_value" hint="Opcional">
                <Input
                  id="default_value"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                />
              </FormField>
            )}

            <FormField label="Orden" htmlFor="sort_order">
              <Input
                id="sort_order"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </FormField>
          </div>

          {/* Required */}
          <div className="flex items-center gap-2">
            <input
              id="is_required"
              type="checkbox"
              className="h-4 w-4 accent-orange-500 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
            />
            <label htmlFor="is_required" className="text-sm text-gray-700 cursor-pointer">
              Campo requerido
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Link href="/dashboard/settings/custom-fields">
              <Button type="button" variant="outline" size="sm" disabled={submitting}>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" size="sm" disabled={submitting} className="bg-orange-500 hover:bg-orange-600 text-white">
              {submitting ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
