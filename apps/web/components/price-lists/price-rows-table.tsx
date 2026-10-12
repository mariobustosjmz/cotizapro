'use client'

import { Trash2 } from 'lucide-react'
import type { EditableRow } from '@/lib/pricing/price-list-rows'
import { parsePrice } from '@/lib/pricing/price-list-rows'
import { formatAmount } from '@/lib/pricing/client-preview'
import { humanizeKey } from './types'

interface PriceRowsTableProps {
  readonly listId: string
  readonly dimensions: readonly string[]
  readonly rows: readonly EditableRow[]
  readonly errors: Readonly<Record<string, string>>
  readonly readOnly: boolean
  readonly onKeyChange: (uid: string, dimension: string, value: string) => void
  readonly onPriceChange: (uid: string, value: string) => void
  readonly onRemove: (uid: string) => void
}

const INPUT_CLASS =
  'w-full px-2 py-1 border rounded-md text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500'

function inputBorder(hasError: boolean): string {
  return hasError ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-gray-300 dark:border-gray-700'
}

interface RowProps extends Omit<PriceRowsTableProps, 'rows' | 'errors'> {
  readonly row: EditableRow
  readonly index: number
  readonly error: string | undefined
}

function PriceRow({ listId, dimensions, row, index, error, readOnly, onKeyChange, onPriceChange, onRemove }: RowProps) {
  const price = parsePrice(row.price)
  return (
    <tr className="border-b border-gray-50 dark:border-gray-800 last:border-0 align-top">
      {dimensions.map((dim) => (
        <td key={dim} className="py-1.5 px-3">
          {readOnly ? (
            <span className="text-sm text-gray-900 dark:text-gray-100">{row.keys[dim]}</span>
          ) : (
            <input
              aria-label={`${humanizeKey(dim)} fila ${index + 1}`}
              value={row.keys[dim] ?? ''}
              onChange={(e) => onKeyChange(row.uid, dim, e.target.value)}
              className={`${INPUT_CLASS} ${inputBorder(Boolean(error) && !(row.keys[dim] ?? '').trim())} max-w-[16rem]`}
            />
          )}
        </td>
      ))}
      <td className="py-1.5 px-3 text-right">
        {readOnly ? (
          <span className="text-sm tabular-nums text-gray-900 dark:text-gray-100">${price === null ? row.price : formatAmount(price)}</span>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <span className="text-xs text-gray-400">$</span>
            <input
              data-testid={`${listId}-price-${index}`}
              aria-label={`Precio fila ${index + 1}`}
              inputMode="decimal"
              value={row.price}
              onChange={(e) => onPriceChange(row.uid, e.target.value)}
              className={`${INPUT_CLASS} ${inputBorder(Boolean(error) && price === null)} max-w-[8rem] text-right tabular-nums`}
            />
          </div>
        )}
        {error && <p className="mt-0.5 text-[11px] text-red-600 dark:text-red-400">{error}</p>}
      </td>
      {!readOnly && (
        <td className="py-1.5 px-2 text-right w-10">
          <button
            type="button"
            onClick={() => onRemove(row.uid)}
            aria-label={`Quitar fila ${index + 1}`}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      )}
    </tr>
  )
}

export function PriceRowsTable(props: PriceRowsTableProps) {
  const { dimensions, rows, errors, readOnly } = props
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 dark:border-gray-800">
            {dimensions.map((dim) => (
              <th key={dim} className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                {humanizeKey(dim)}
              </th>
            ))}
            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Precio (MXN)</th>
            {!readOnly && <th className="w-10" aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={dimensions.length + 2} className="py-4 px-3 text-center text-xs text-gray-400 dark:text-gray-500">
                Esta lista no tiene precios
              </td>
            </tr>
          ) : (
            rows.map((row, index) => <PriceRow key={row.uid} {...props} row={row} index={index} error={errors[row.uid]} />)
          )}
        </tbody>
      </table>
    </div>
  )
}
