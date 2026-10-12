'use client'

import { useState } from 'react'
import { emptyRow, rowsToPayload, sameRows, toEditableRows } from '@/lib/pricing/price-list-rows'
import type { EditableRow } from '@/lib/pricing/price-list-rows'
import { archivePriceList, patchPriceList } from './price-list-api'
import type { PriceListPatch } from './price-list-api'
import type { ApiResult, PriceListRecord } from './types'

export type DraftBusy = 'save' | 'adjust' | 'archive' | null

export interface DraftCallbacks {
  readonly onSuccess: (message: string) => void
  readonly onError: (message: string) => void
  readonly onForbidden: () => void
  readonly onArchived: (id: string) => void
}

export function usePriceListDraft(list: PriceListRecord, callbacks: DraftCallbacks) {
  const [saved, setSaved] = useState<readonly EditableRow[]>(() => toEditableRows(list.rows))
  const [rows, setRows] = useState<readonly EditableRow[]>(saved)
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({})
  const [busy, setBusy] = useState<DraftBusy>(null)
  const dirty = !sameRows(rows, saved)

  function updateRow(uid: string, change: (row: EditableRow) => EditableRow) {
    setRows((prev) => prev.map((row) => (row.uid === uid ? change(row) : row)))
  }

  function failed(result: Extract<ApiResult<unknown>, { ok: false }>) {
    if (result.status === 403) callbacks.onForbidden()
    callbacks.onError(result.error)
  }

  async function sendPatch(patch: PriceListPatch, kind: 'save' | 'adjust', message: string): Promise<boolean> {
    setBusy(kind)
    const result = await patchPriceList(list.id, patch)
    setBusy(null)
    if (!result.ok) {
      failed(result)
      return false
    }
    const next = toEditableRows(result.data?.rows ?? [])
    setSaved(next)
    setRows(next)
    setErrors({})
    callbacks.onSuccess(message)
    return true
  }

  async function save(): Promise<boolean> {
    const payload = rowsToPayload(rows, list.dimensions)
    if (!payload.ok) {
      setErrors(payload.errors)
      callbacks.onError('Revisa las filas marcadas en rojo')
      return false
    }
    return sendPatch({ rows: payload.rows }, 'save', `Precios de "${list.name}" guardados`)
  }

  async function archive(): Promise<boolean> {
    setBusy('archive')
    const result = await archivePriceList(list.id)
    setBusy(null)
    if (!result.ok) {
      failed(result)
      return false
    }
    callbacks.onArchived(list.id)
    return true
  }

  return {
    rows,
    errors,
    busy,
    dirty,
    setKey: (uid: string, dim: string, value: string) => updateRow(uid, (row) => ({ ...row, keys: { ...row.keys, [dim]: value } })),
    setPrice: (uid: string, value: string) => updateRow(uid, (row) => ({ ...row, price: value })),
    addRow: () => setRows((prev) => [...prev, emptyRow(list.dimensions)]),
    removeRow: (uid: string) => setRows((prev) => prev.filter((row) => row.uid !== uid)),
    discard: () => {
      setRows(saved)
      setErrors({})
    },
    save,
    adjust: (percent: number) => sendPatch({ adjust_percent: percent }, 'adjust', `Ajuste de ${percent} % aplicado a "${list.name}"`),
    archive,
  }
}
