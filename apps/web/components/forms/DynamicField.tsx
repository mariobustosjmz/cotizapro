'use client'

import { useState, useRef } from 'react'
import type { CustomFieldDefinition } from '@/types/custom-fields'

interface ComboboxProps {
  id: string
  name: string
  options: { value: string; label: string }[]
  defaultValue?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  fieldError?: string
  onChange?: (value: string) => void
}

function ComboboxField({
  id,
  name,
  options,
  defaultValue = '',
  placeholder,
  required,
  disabled,
  fieldError,
  onChange,
}: ComboboxProps) {
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
    onChange?.(value)
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
        className={`w-full px-3 py-2 border rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 ${
          hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
        }`}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg text-sm">
          {filtered.map((o) => (
            <li
              key={o.value}
              onMouseDown={() => selectOption(o.value, o.label)}
              className={`px-3 py-2 cursor-pointer hover:bg-orange-50 ${
                o.value === selectedValue ? 'bg-orange-100 font-medium' : ''
              }`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {hasError && <p className="mt-1 text-xs text-red-600">{fieldError}</p>}
    </div>
  )
}

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
            defaultValue={typeof value === 'string' && value ? value : new Date().toISOString().split('T')[0]}
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
          <ComboboxField
            id={id}
            name={field.field_key}
            options={field.options ?? []}
            defaultValue={typeof value === 'string' ? value : ''}
            placeholder={field.placeholder ?? `Seleccionar ${field.field_label}`}
            required={field.is_required}
            disabled={disabled}
            onChange={(val) => onChange(field.field_key, val || null)}
          />
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
