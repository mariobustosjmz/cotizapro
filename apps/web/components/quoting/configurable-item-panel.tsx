'use client'

import { useMemo } from 'react'
import { selectOptions } from '@cotizapro/quoting'
import type { InputField, InputValue, PriceList } from '@cotizapro/quoting'
import { Combobox } from '@/components/ui/combobox'
import { type ItemInput, type PreviewState, previewItem } from '@/lib/pricing/client-preview'
import { BreakdownTable } from './breakdown-table'

interface ConfigurableItemPanelProps {
  readonly fieldPrefix: string
  readonly serviceName: string
  readonly definition: unknown
  readonly priceLists: readonly PriceList[]
  readonly value: ItemInput
  readonly onChange: (next: ItemInput, preview: PreviewState) => void
}

const UNIT_SUFFIX: Readonly<Record<string, string>> = { mm: 'mm', cm: 'cm', m: 'm', pz: 'pz', h: 'h', ml: 'ml' }

export function humanizeOption(value: string): string {
  const text = value.replace(/-/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function optionsFor(field: Extract<InputField, { kind: 'select' }>, lists: readonly PriceList[]) {
  if (field.options) return field.options.map((o) => ({ value: o.value, label: o.label }))
  return selectOptions(field, lists).map((v) => ({ value: v, label: humanizeOption(v) }))
}

interface FieldProps {
  readonly id: string
  readonly field: InputField
  readonly value: InputValue | undefined
  readonly priceLists: readonly PriceList[]
  readonly onValue: (value: InputValue | undefined) => void
}

function ItemField({ id, field, value, priceLists, onValue }: FieldProps) {
  if (field.kind === 'boolean') {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 pt-5">
        <input id={id} type="checkbox" checked={value === true} onChange={(e) => onValue(e.target.checked)} className="accent-orange-500" />
        {field.label}
      </label>
    )
  }
  const label = <label htmlFor={id} className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{field.label} *</label>
  if (field.kind === 'select') {
    return (
      <div className="col-span-2">
        {label}
        <Combobox id={id} name={id} options={optionsFor(field, priceLists)} defaultValue={typeof value === 'string' ? value : ''} onChange={(v) => onValue(v || undefined)} required />
      </div>
    )
  }
  return (
    <div>
      {label}
      <div className="flex items-center gap-1">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step="any"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onValue(e.target.value === '' ? undefined : Number(e.target.value))}
          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-md text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {field.unit && <span className="text-[11px] text-gray-400">{UNIT_SUFFIX[field.unit]}</span>}
      </div>
    </div>
  )
}

/** Captura las entradas de un producto configurable y muestra el cálculo del motor en vivo. */
export function ConfigurableItemPanel({ fieldPrefix, serviceName, definition, priceLists, value, onChange }: ConfigurableItemPanelProps) {
  const preview = useMemo(() => previewItem(serviceName, definition, priceLists, value), [serviceName, definition, priceLists, value])

  function setField(key: string, next: InputValue | undefined) {
    const entries = Object.entries(value).filter(([k]) => k !== key)
    const updated: ItemInput = Object.fromEntries(next === undefined ? entries : [...entries, [key, next]])
    onChange(updated, previewItem(serviceName, definition, priceLists, updated))
  }

  if (!preview.definition) {
    return <p className="text-xs text-red-600 px-3 py-2">Este producto tiene una configuración inválida: {preview.errors[0]}</p>
  }

  return (
    <div className="mx-3 mb-2 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20 p-3 space-y-3" data-testid={`${fieldPrefix}-panel`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {preview.definition.inputs.map((field) => (
          <ItemField key={field.key} id={`${fieldPrefix}-${field.key}`} field={field} value={value[field.key]} priceLists={priceLists} onValue={(v) => setField(field.key, v)} />
        ))}
      </div>
      {preview.result ? (
        <BreakdownTable lines={preview.result.lines} subtotalCents={preview.result.subtotalCents} />
      ) : (
        <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc pl-4" data-testid={`${fieldPrefix}-errors`}>
          {preview.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
