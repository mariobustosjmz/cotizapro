import { priceListSchema } from '@cotizapro/quoting'
import type { PriceListRow } from '@cotizapro/quoting'
import type { ApiResult, PriceListRecord } from './types'

const FORBIDDEN_MESSAGE = 'Solo el dueño o un administrador pueden modificar las listas de precios.'

interface RawRecord {
  readonly is_active?: unknown
  readonly updated_at?: unknown
}

function toRecord(raw: unknown): PriceListRecord | null {
  const parsed = priceListSchema.safeParse(raw)
  if (!parsed.success) return null
  const extra = raw as RawRecord
  return { ...parsed.data, is_active: extra.is_active !== false, updated_at: String(extra.updated_at ?? '') }
}

async function readError(response: Response, fallback: string): Promise<string> {
  if (response.status === 403) return FORBIDDEN_MESSAGE
  const body: unknown = await response.json().catch(() => null)
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error
  return fallback
}

async function request<T>(url: string, init: RequestInit, fallback: string, map: (body: unknown) => T): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, init)
    if (!response.ok) return { ok: false, status: response.status, error: await readError(response, fallback) }
    const body: unknown = response.status === 204 ? null : await response.json()
    return { ok: true, data: map(body) }
  } catch {
    return { ok: false, status: 0, error: 'No hay conexión con el servidor. Intenta de nuevo.' }
  }
}

function dataOf(body: unknown): unknown {
  return body && typeof body === 'object' && 'data' in body ? body.data : null
}

export function fetchPriceLists(): Promise<ApiResult<readonly PriceListRecord[]>> {
  return request('/api/price-lists', { method: 'GET' }, 'No se pudieron cargar las listas de precios', (body) => {
    const rows = dataOf(body)
    return Array.isArray(rows) ? rows.map(toRecord).filter((r): r is PriceListRecord => r !== null) : []
  })
}

export interface PriceListPatch {
  readonly rows?: readonly PriceListRow[]
  readonly adjust_percent?: number
}

export function patchPriceList(id: string, patch: PriceListPatch): Promise<ApiResult<PriceListRecord | null>> {
  const init: RequestInit = { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) }
  return request(`/api/price-lists/${id}`, init, 'No se pudo guardar la lista', (body) => toRecord(dataOf(body)))
}

export function archivePriceList(id: string): Promise<ApiResult<null>> {
  return request(`/api/price-lists/${id}`, { method: 'DELETE' }, 'No se pudo archivar la lista', () => null)
}
