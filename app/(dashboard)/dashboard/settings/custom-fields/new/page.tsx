'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { ArrowLeft } from 'lucide-react'
import type { EntityType, FieldType } from '@/types/custom-fields'

const ENTITY_OPTIONS: { label: string; value: EntityType }[] = [
  { label: 'Clientes', value: 'client' },
  { label: 'Servicios', value: 'service' },
  { label: 'Cotizaciones', value: 'quote' },
]

const FIELD_TYPE_OPTIONS: { label: string; value: FieldType }[] = [
  { label: 'Texto corto', value: 'text' },
  { label: 'Texto largo', value: 'textarea' },
  { label: 'Numero', value: 'number' },
  { label: 'Fecha', value: 'date' },
  { label: 'Lista de opciones', value: 'select' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'URL', value: 'url' },
  { label: 'Telefono', value: 'phone' },
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
      setError('Error de conexion. Por favor intenta de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectClass = "w-full h-9 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"

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
          <h2 className="text-xl font-bold text-gray-900">Nuevo Campo</h2>
          <p className="text-xs text-gray-500">Define un campo personalizado</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200">
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Entidad" htmlFor="entity_type" required>
              <select
                id="entity_type"
                className={selectClass}
                value={entityType}
                onChange={(e) => setEntityType(e.target.value as EntityType)}
              >
                {ENTITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Tipo" htmlFor="field_type" required>
              <select
                id="field_type"
                className={selectClass}
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as FieldType)}
              >
                {FIELD_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Etiqueta" htmlFor="field_label" required>
            <Input
              id="field_label"
              value={fieldLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Ej: Numero de Licencia"
              required
            />
          </FormField>

          <FormField label="Identificador" htmlFor="field_key" required hint="Solo letras minusculas, numeros y guiones bajos. No se puede cambiar despues.">
            <Input
              id="field_key"
              value={fieldKey}
              onChange={(e) => {
                setFieldKeyManual(true)
                setFieldKey(e.target.value)
              }}
              placeholder="numero_licencia"
              pattern="^[a-z0-9_]+$"
              title="Solo letras minusculas, numeros y guiones bajos"
              required
            />
          </FormField>

          {/* Select options */}
          {fieldType === 'select' && (
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
            {fieldType !== 'checkbox' && (
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
            {fieldType !== 'checkbox' && fieldType !== 'select' && (
              <FormField label="Valor por defecto" htmlFor="default_value" hint="Opcional">
                <Input
                  id="default_value"
                  value={defaultValue}
                  onChange={(e) => setDefaultValue(e.target.value)}
                />
              </FormField>
            )}
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
              {submitting ? 'Guardando...' : 'Crear Campo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
