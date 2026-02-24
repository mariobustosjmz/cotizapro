'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { EntityType, FieldType } from '@/types/custom-fields'

const ENTITY_OPTIONS: { label: string; value: EntityType }[] = [
  { label: 'Clientes', value: 'client' },
  { label: 'Servicios', value: 'service' },
  { label: 'Cotizaciones', value: 'quote' },
]

const FIELD_TYPE_OPTIONS: { label: string; value: FieldType }[] = [
  { label: 'Texto corto', value: 'text' },
  { label: 'Texto largo', value: 'textarea' },
  { label: 'Número', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Lista de opciones', value: 'select' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'URL', value: 'url' },
  { label: 'Teléfono', value: 'phone' },
  { label: 'Email', value: 'email' },
]

function toFieldKey(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 100)
}

interface SelectOption {
  value: string
  label: string
}

export default function NewCustomFieldPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialEntityType = (searchParams.get('entity_type') as EntityType) ?? 'client'

  const [entityType, setEntityType] = useState<EntityType>(initialEntityType)
  const [fieldLabel, setFieldLabel] = useState('')
  const [fieldKey, setFieldKey] = useState('')
  const [fieldKeyManual, setFieldKeyManual] = useState(false)
  const [fieldType, setFieldType] = useState<FieldType>('text')
  const [isRequired, setIsRequired] = useState(false)
  const [placeholder, setPlaceholder] = useState('')
  const [defaultValue, setDefaultValue] = useState('')
  const [options, setOptions] = useState<SelectOption[]>([{ value: '', label: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function handleLabelChange(value: string) {
    setFieldLabel(value)
    if (!fieldKeyManual) {
      setFieldKey(toFieldKey(value))
    }
  }

  function handleAddOption() {
    setOptions([...options, { value: '', label: '' }])
  }

  function handleRemoveOption(index: number) {
    setOptions(options.filter((_, i) => i !== index))
  }

  function handleOptionChange(index: number, field: 'value' | 'label', val: string) {
    const updated = options.map((opt, i) =>
      i === index ? { ...opt, [field]: val } : opt
    )
    setOptions(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const body: Record<string, unknown> = {
      entity_type: entityType,
      field_key: fieldKey,
      field_label: fieldLabel,
      field_type: fieldType,
      is_required: isRequired,
      placeholder: placeholder || null,
      default_value: defaultValue || null,
      sort_order: 0,
    }

    if (fieldType === 'select') {
      const validOptions = options.filter((o) => o.value.trim() && o.label.trim())
      body.options = validOptions
    }

    try {
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Error al crear el campo.')
        return
      }

      router.push(`/dashboard/settings/custom-fields?entity_type=${entityType}`)
    } catch {
      setError('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard/settings/custom-fields"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Campos Personalizados
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Nuevo Campo</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Entity type */}
        <div>
          <label className={labelClass}>Entidad</label>
          <select
            className={inputClass}
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as EntityType)}
          >
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Field label */}
        <div>
          <label className={labelClass}>
            Etiqueta <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={inputClass}
            value={fieldLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Ej: Número de Licencia"
            required
          />
        </div>

        {/* Field key */}
        <div>
          <label className={labelClass}>
            Identificador <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className={inputClass}
            value={fieldKey}
            onChange={(e) => {
              setFieldKeyManual(true)
              setFieldKey(e.target.value)
            }}
            placeholder="numero_licencia"
            pattern="^[a-z0-9_]+$"
            title="Solo letras minúsculas, números y guiones bajos"
            required
          />
          <p className="mt-1 text-xs text-gray-400">
            Solo letras minúsculas, números y guiones bajos. No se puede cambiar después.
          </p>
        </div>

        {/* Field type */}
        <div>
          <label className={labelClass}>
            Tipo <span className="text-red-500">*</span>
          </label>
          <select
            className={inputClass}
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as FieldType)}
          >
            {FIELD_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Select options */}
        {fieldType === 'select' && (
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
        {fieldType !== 'checkbox' && (
          <div>
            <label className={labelClass}>Placeholder (opcional)</label>
            <input
              type="text"
              className={inputClass}
              value={placeholder}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="Texto de ayuda en el campo"
            />
          </div>
        )}

        {/* Default value */}
        {fieldType !== 'checkbox' && fieldType !== 'select' && (
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
            {submitting ? 'Guardando...' : 'Crear Campo'}
          </button>
        </div>
      </form>
    </div>
  )
}
