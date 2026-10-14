export interface AdminRpcError {
  readonly status: number
  readonly error: string
  readonly field?: string
}

const ADMIN_RPC_ERRORS: Readonly<Record<string, AdminRpcError>> = {
  forbidden: { status: 404, error: 'No encontrado' },
  org_not_found: { status: 404, error: 'La empresa no existe' },
  invalid_plan: { status: 400, error: 'Plan inválido', field: 'plan' },
  invalid_users: { status: 400, error: 'Usuarios: de 1 a 500', field: 'users' },
  invalid_months: { status: 400, error: 'Meses: de 1 a 12', field: 'months' },
  invalid_amount: { status: 400, error: 'Monto inválido' },
  invalid_reference: { status: 400, error: 'Escribe la referencia del pago de Mercado Pago (máximo 120 caracteres)', field: 'reference' },
  invalid_reason: { status: 400, error: 'Escribe el motivo (de 3 a 300 caracteres)', field: 'reason' },
  free_plan_not_suspendable: { status: 409, error: 'El plan Gratis no vence; no se puede suspender' },
}

/** Traduce las excepciones de las RPC admin_* (migración 042). */
export function adminRpcError(message: string | undefined): AdminRpcError {
  if (message && Object.hasOwn(ADMIN_RPC_ERRORS, message)) return ADMIN_RPC_ERRORS[message]
  return { status: 500, error: 'No se pudo completar la acción' }
}
