import type { QuoteRequestFilter, QuoteRequestStatus } from './types'

export const STATUS_LABELS: Readonly<Record<QuoteRequestStatus, string>> = {
  new: 'Nueva',
  converted: 'Convertida',
  discarded: 'Descartada',
}

export const STATUS_BADGE_CLASSES: Readonly<Record<QuoteRequestStatus, string>> = {
  new: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  converted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  discarded: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

export const FILTER_OPTIONS: ReadonlyArray<{ readonly value: QuoteRequestFilter; readonly label: string }> = [
  { value: 'new', label: 'Nuevas' },
  { value: 'converted', label: 'Convertidas' },
  { value: 'discarded', label: 'Descartadas' },
  { value: 'all', label: 'Todas' },
]

export const DETAIL_LABELS: Readonly<Record<string, string>> = {
  medidas: 'Medidas',
  piezas: 'Piezas',
}
