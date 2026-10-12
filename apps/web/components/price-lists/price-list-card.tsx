'use client'

import { useState } from 'react'
import { Archive, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BulkAdjust } from './bulk-adjust'
import { ConfirmDialog } from './confirm-dialog'
import { PriceRowsTable } from './price-rows-table'
import { usePriceListDraft } from './use-price-list-draft'
import type { DraftCallbacks } from './use-price-list-draft'
import { UNIT_LABEL, humanizeKey } from './types'
import type { PriceListRecord } from './types'

interface PriceListCardProps extends DraftCallbacks {
  readonly list: PriceListRecord
  readonly readOnly: boolean
}

interface CardHeaderProps {
  readonly list: PriceListRecord
  readonly count: number
  readonly readOnly: boolean
  readonly onArchive: () => void
}

function CardHeader({ list, count, readOnly, onArchive }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-gray-50/60 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{list.name}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Precio {UNIT_LABEL[list.unit]} · {list.dimensions.map(humanizeKey).join(' × ')} · {count} {count === 1 ? 'precio' : 'precios'}
        </p>
      </div>
      {!readOnly && (
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs px-2 flex-shrink-0" onClick={onArchive}>
          <Archive className="w-3.5 h-3.5" />
          Archivar
        </Button>
      )}
    </div>
  )
}

export function PriceListCard({ list, readOnly, ...callbacks }: PriceListCardProps) {
  const draft = usePriceListDraft(list, callbacks)
  const [confirmArchive, setConfirmArchive] = useState(false)

  return (
    <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" data-testid={`price-list-${list.id}`}>
      <CardHeader list={list} count={draft.rows.length} readOnly={readOnly} onArchive={() => setConfirmArchive(true)} />
      <PriceRowsTable
        listId={list.id}
        dimensions={list.dimensions}
        rows={draft.rows}
        errors={draft.errors}
        readOnly={readOnly}
        onKeyChange={draft.setKey}
        onPriceChange={draft.setPrice}
        onRemove={draft.removeRow}
      />
      {!readOnly && (
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-col gap-2">
            <button type="button" onClick={draft.addRow} className="self-start text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
              <Plus className="w-3 h-3" />
              Agregar fila
            </button>
            <BulkAdjust
              listId={list.id}
              listName={list.name}
              disabledReason={draft.dirty ? 'Guarda o descarta los cambios antes de ajustar.' : null}
              busy={draft.busy !== null}
              onApply={draft.adjust}
            />
          </div>
          <div className="flex gap-2 lg:w-72">
            <Button type="button" variant="outline" size="sm" className="flex-1" onClick={draft.discard} disabled={!draft.dirty || draft.busy !== null}>
              Descartar
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
              onClick={draft.save}
              disabled={!draft.dirty || draft.busy !== null}
            >
              {draft.busy === 'save' ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      )}
      {confirmArchive && (
        <ConfirmDialog
          title="Archivar lista"
          message={`"${list.name}" dejará de estar disponible para cotizaciones nuevas. Las cotizaciones ya guardadas no cambian.`}
          confirmLabel="Archivar"
          busyLabel="Archivando..."
          tone="danger"
          busy={draft.busy === 'archive'}
          onCancel={() => setConfirmArchive(false)}
          onConfirm={async () => {
            const archived = await draft.archive()
            if (!archived) setConfirmArchive(false)
          }}
        />
      )}
    </section>
  )
}
