'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { CustomFieldDefinition, FieldType } from '@/types/custom-fields'

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Número',
  date: 'Fecha',
  select: 'Lista de opciones',
  checkbox: 'Checkbox',
  url: 'URL',
  phone: 'Teléfono',
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

  // Editable fields
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
      setError('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-400">Cargando...</p>
      </div>
    )
  }

  if (!field) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-red-600">{error || 'Campo no encontrado.'}</p>
        <Link href="/dashboard/settings/custom-fields" className="mt-2 text-sm text-blue-600">
          Volver
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard/settings/custom-fields"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Campos Personalizados
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Editar Campo</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Read-only info */}
        <div className="grid grid-cols-2 gap-4 rounded-md bg-gray-50 p-4 text-sm">
          <div>
            <span className="font-medium text-gray-500">Identificador</span>
            <p className="mt-0.5 font-mono text-gray-900">{field.field_key}</p>
          </div>
          <div>
            <span className="font-medium text-gray-500">Tipo</span>
            <p className="mt-0.5 text-gray-900">{FIELD_TYPE_LABELS[field.field_type]}</p>
          </div>
        </div>

        {/* Editable: label */}
        <div>
          <label className={labelClass}>
            Etiqueta <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={inputClass}
            value={fieldLabel}
            onChange={(e) => setFieldLabel(e.target.value)}
            required
          />
        </div>

        {/* Select options */}
        {field.field_type === 'select' && (
          <div>
            <label className={labelClass}>Opciones</label>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    className={`${inputClass} flex-1`}
                    value={opt.value}
                    onChange={(e) => handleOptionChange(i, 'value', e.target.value)}
                    placeholder="valor"
                  />
                  <input
                    type="text"
                    className={`${inputClass} flex-1`}
                    value={opt.label}
                    onChange={(e) => handleOptionChange(i, 'label', e.target.value)}
                    placeholder="etiqueta"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(i)}
                    className="shrink-0 text-gray-400 hover:text-red-500"
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
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              + Agregar opción
            </button>
          </div>
        )}

        {/* Required */}
        <div className="flex items-center gap-2">
          <input
            id="is_required"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
          />
          <label htmlFor="is_required" className="text-sm text-gray-700">
            Campo requerido
          </label>
        </div>

        {/* Placeholder */}
        {field.field_type !== 'checkbox' && (
          <div>
            <label className={labelClass}>Placeholder (opcional)</label>
            <input
              type="text"
              className={inputClass}
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
            />
          </div>
        )}

        {/* Default value */}
        {field.field_type !== 'checkbox' && field.field_type !== 'select' && (
          <div>
            <label className={labelClass}>Valor por defecto (opcional)</label>
            <input
              type="text"
              className={inputClass}
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
            />
          </div>
        )}

        {/* Sort order */}
        <div>
          <label className={labelClass}>Orden</label>
          <input
            type="number"
            className={inputClass}
            value={sortOrder}
            min={0}
            onChange={(e) => setSortOrder(Number(e.target.value))}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
          <Link
            href="/dashboard/settings/custom-fields"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
