import type { PriceList } from '@cotizapro/quoting'

export interface PriceListRecord extends PriceList {
  readonly is_active: boolean
  readonly updated_at: string
}

export type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly status: number; readonly error: string }

export const UNIT_LABEL: Readonly<Record<PriceList['unit'], string>> = {
  sqm: 'por m²',
  lm: 'por metro lineal',
  unit: 'por pieza',
  hour: 'por hora',
  fixed: 'precio fijo',
}

export function humanizeKey(key: string): string {
  const text = key.replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}
