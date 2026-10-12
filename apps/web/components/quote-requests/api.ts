import type {
  ApiErrorBody,
  ConvertQuoteRequestResponse,
  QuoteRequest,
  QuoteRequestFilter,
  QuoteRequestListResponse,
} from './types'

type PatchableStatus = 'new' | 'discarded'

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null
  return body?.error ?? fallback
}

export async function fetchQuoteRequests(filter: QuoteRequestFilter): Promise<readonly QuoteRequest[]> {
  const query = filter === 'all' ? '' : `?status=${filter}`
  const response = await fetch(`/api/quote-requests${query}`, { cache: 'no-store' })
  if (!response.ok) throw new Error(await errorMessage(response, 'No se pudieron cargar las solicitudes'))
  const body = (await response.json()) as QuoteRequestListResponse
  return body.data ?? []
}

export async function patchQuoteRequestStatus(id: string, status: PatchableStatus): Promise<void> {
  const response = await fetch(`/api/quote-requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) throw new Error(await errorMessage(response, 'No se pudo actualizar la solicitud'))
}

export async function convertQuoteRequest(id: string): Promise<string> {
  const response = await fetch(`/api/quote-requests/${id}/convert`, { method: 'POST' })
  if (!response.ok) throw new Error(await errorMessage(response, 'No se pudo convertir la solicitud'))
  const body = (await response.json()) as ConvertQuoteRequestResponse
  return body.data.client_id
}

export type { PatchableStatus }
