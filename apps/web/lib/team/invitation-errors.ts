/** Token de invitations.token: 32 bytes aleatorios en hexadecimal (migración 001). */
export const INVITE_TOKEN_PATTERN = /^[a-f0-9]{64}$/

export interface InvitationRpcError {
  readonly status: number
  readonly error: string
}

const INVITATION_RPC_ERRORS: Readonly<Record<string, InvitationRpcError>> = {
  not_authenticated: { status: 401, error: 'Inicia sesión para aceptar la invitación' },
  already_member: { status: 400, error: 'Ya perteneces a una organización' },
  invalid_invitation: { status: 400, error: 'Invitación inválida o expirada' },
  email_mismatch: { status: 403, error: 'Esta invitación es para otro correo. Entra o crea tu cuenta con el correo invitado.' },
}

/** Traduce las excepciones de accept_invitation (migración 039). */
export function invitationRpcError(message: string | undefined): InvitationRpcError {
  return INVITATION_RPC_ERRORS[message ?? ''] ?? { status: 500, error: 'No se pudo aceptar la invitación' }
}
