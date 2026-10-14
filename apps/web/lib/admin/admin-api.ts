import type { PlanActivationRow } from './types'

export interface AdminActionResponse {
  readonly ok: boolean
  readonly error: string | null
  readonly fieldErrors: Readonly<Record<string, string>>
}

interface ErrorBody {
  readonly error?: string
  readonly fieldErrors?: Readonly<Record<string, string>>
}

export async function postAdminAction(url: string, body: Readonly<Record<string, unknown>>): Promise<AdminActionResponse> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) return { ok: true, error: null, fieldErrors: {} }
    const data: ErrorBody = await res.json().catch(() => ({}))
    return { ok: false, error: data.error ?? 'No se pudo completar la acción', fieldErrors: data.fieldErrors ?? {} }
  } catch {
    return { ok: false, error: 'Error de conexión. Intenta de nuevo.', fieldErrors: {} }
  }
}

export async function fetchActivations(organizationId: string): Promise<readonly PlanActivationRow[] | null> {
  try {
    const res = await fetch(`/api/admin/organizations/${organizationId}/activations`)
    if (!res.ok) return null
    const body: { data?: PlanActivationRow[] } = await res.json()
    return body.data ?? []
  } catch {
    return null
  }
}
