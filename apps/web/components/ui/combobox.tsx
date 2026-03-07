'use client'

import { useState, useRef } from 'react'

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

export function Combobox({
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
