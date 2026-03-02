'use client'

import { useEffect, useState } from 'react'
import type { CustomFieldDefinition, EntityType, CustomFieldValues } from '@/types/custom-fields'
import { DynamicField } from './DynamicField'

interface DynamicFieldsSectionProps {
  entityType: EntityType
  values: CustomFieldValues
  onChange: (values: CustomFieldValues) => void
  disabled?: boolean
}

export function DynamicFieldsSection({
  entityType,
  values,
  onChange,
  disabled = false,
}: DynamicFieldsSectionProps) {
  const [fields, setFields] = useState<CustomFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchFields() {
      try {
        const res = await fetch(`/api/custom-fields?entity_type=${entityType}&active_only=true`)
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) {
          setFields(json.data ?? [])
        }
      } catch {
        // Non-critical — custom fields are optional
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchFields()
    return () => { cancelled = true }
  }, [entityType])

  function handleFieldChange(key: string, value: string | number | boolean | null) {
    onChange({ ...values, [key]: value })
  }

  if (loading) {
    return (
      <div className="mt-6 border-t border-gray-200 pt-6">
        <p className="text-sm text-gray-400">Cargando campos personalizados...</p>
      </div>
    )
  }

  if (fields.length === 0) {
    return null
  }

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <h3 className="mb-4 text-sm font-semibold text-gray-700">Campos personalizados</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.id}
            className={field.field_type === 'textarea' ? 'sm:col-span-2' : ''}
          >
            <DynamicField
              field={field}
              value={values[field.field_key] ?? field.default_value ?? null}
              onChange={handleFieldChange}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
