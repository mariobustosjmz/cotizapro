/** Traduce las excepciones de set_member_role / remove_member (migración 038) a respuestas HTTP. */
export interface MemberRpcError {
  readonly status: number
  readonly error: string
}

const MEMBER_RPC_ERRORS: Readonly<Record<string, MemberRpcError>> = {
  forbidden: { status: 403, error: 'Permisos insuficientes' },
  self_change: { status: 400, error: 'No puedes modificar tu propio usuario' },
  not_found: { status: 404, error: 'Miembro no encontrado' },
  owner_protected: { status: 400, error: 'No puedes modificar al propietario' },
  owner_only: { status: 403, error: 'Solo el propietario puede promover a administrador' },
  invalid_role: { status: 400, error: 'Rol inválido' },
}

export function memberRpcError(message: string | undefined): MemberRpcError {
  return MEMBER_RPC_ERRORS[message ?? ''] ?? { status: 500, error: 'Error interno del servidor' }
}
