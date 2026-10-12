'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from './confirm-dialog'

interface BulkAdjustProps {
  readonly listId: string
  readonly listName: string
  readonly disabledReason: string | null
  readonly busy: boolean
  readonly onApply: (percent: number) => Promise<boolean>
}

const MIN_PERCENT = -90
const MAX_PERCENT = 500

function parsePercent(text: string): number | null {
  const value = Number(text.replace(',', '.').trim())
  if (text.trim() === '' || !Number.isFinite(value) || value === 0) return null
  return value >= MIN_PERCENT && value <= MAX_PERCENT ? value : null
}

export function BulkAdjust({ listId, listName, disabledReason, busy, onApply }: BulkAdjustProps) {
  const [text, setText] = useState('')
  const [confirming, setConfirming] = useState(false)
  const percent = parsePercent(text)
  const invalid = text.trim() !== '' && percent === null
  const inputId = `${listId}-adjust`

  async function confirm() {
    if (percent === null) return
    const applied = await onApply(percent)
    setConfirming(false)
    if (applied) setText('')
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor={inputId} className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">% de ajuste</label>
        <input
          id={inputId}
          inputMode="decimal"
          placeholder="Ej. 8 o -5"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabledReason !== null || busy}
          className={`w-28 px-2 py-1 border rounded-md text-sm tabular-nums text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 ${
            invalid ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : 'border-gray-300 dark:border-gray-700'
          }`}
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)} disabled={percent === null || disabledReason !== null || busy}>
        Aplicar
      </Button>
      {invalid && <p className="w-full text-[11px] text-red-600 dark:text-red-400">Usa un porcentaje entre {MIN_PERCENT} y {MAX_PERCENT}, distinto de 0.</p>}
      {disabledReason && <p className="w-full text-[11px] text-gray-500 dark:text-gray-400">{disabledReason}</p>}
      {confirming && percent !== null && (
        <ConfirmDialog
          title="Ajustar precios"
          message={`Se ${percent > 0 ? 'aumentarán' : 'reducirán'} en ${Math.abs(percent)} % todos los precios de "${listName}". Las cotizaciones ya guardadas no cambian.`}
          confirmLabel="Aplicar ajuste"
          busyLabel="Aplicando..."
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={confirm}
        />
      )}
    </div>
  )
}
