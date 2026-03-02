'use client'

import type { CustomFieldDefinition } from '@/types/custom-fields'

interface DynamicFieldProps {
  field: CustomFieldDefinition
  value: string | number | boolean | null | undefined
  onChange: (key: string, value: string | number | boolean | null) => void
  disabled?: boolean
}

export function DynamicField({ field, value, onChange, disabled = false }: DynamicFieldProps) {
  const inputClass =
    'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500'

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  const id = `custom-field-${field.field_key}`

  const renderInput = () => {
    switch (field.field_type) {
      case 'textarea':
        return (
          <textarea
            id={id}
            className={`${inputClass} min-h-[80px]`}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder ?? undefined}
            disabled={disabled}
            required={field.is_required}
            onChange={(e) => onChange(field.field_key, e.target.value || null)}
            rows={3}
          />
        )

      case 'number':
        return (
          <input
            id={id}
            type="number"
            className={inputClass}
            value={typeof value === 'number' ? value : (value == null ? '' : String(value))}
            placeholder={field.placeholder ?? undefined}
            disabled={disabled}
            required={field.is_required}
            onChange={(e) => onChange(field.field_key, e.target.value === '' ? null : Number(e.target.value))}
          />
        )

      case 'date':
        return (
          <input
            id={id}
            type="date"
            className={inputClass}
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            required={field.is_required}
            onChange={(e) => onChange(field.field_key, e.target.value || null)}
          />
        )

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              id={id}
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
              checked={value === true}
              disabled={disabled}
              onChange={(e) => onChange(field.field_key, e.target.checked)}
            />
            <span className="text-sm text-gray-600">{field.placeholder ?? field.field_label}</span>
          </div>
        )

      case 'select':
        return (
          <select
            id={id}
            className={inputClass}
            value={typeof value === 'string' ? value : ''}
            disabled={disabled}
            required={field.is_required}
            onChange={(e) => onChange(field.field_key, e.target.value || null)}
          >
            <option value="">
              {field.placeholder ?? `Seleccionar ${field.field_label}`}
            </option>
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )

      case 'email':
        return (
          <input
            id={id}
            type="email"
            className={inputClass}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder ?? undefined}
            disabled={disabled}
            required={field.is_required}
            onChange={(e) => onChange(field.field_key, e.target.value || null)}
          />
        )

      case 'url':
        return (
          <input
            id={id}
            type="url"
            className={inputClass}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder ?? 'https://'}
            disabled={disabled}
            required={field.is_required}
            onChange={(e) => onChange(field.field_key, e.target.value || null)}
          />
        )

      case 'phone':
        return (
          <input
            id={id}
            type="tel"
            className={inputClass}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder ?? undefined}
            disabled={disabled}
            required={field.is_required}
            onChange={(e) => onChange(field.field_key, e.target.value || null)}
          />
        )

      default: // text
        return (
          <input
            id={id}
            type="text"
            className={inputClass}
            value={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder ?? undefined}
            disabled={disabled}
            required={field.is_required}
            onChange={(e) => onChange(field.field_key, e.target.value || null)}
          />
        )
    }
  }

  return (
    <div>
      {field.field_type !== 'checkbox' && (
        <label htmlFor={id} className={labelClass}>
          {field.field_label}
          {field.is_required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {renderInput()}
    </div>
  )
}
