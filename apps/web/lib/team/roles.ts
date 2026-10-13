export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'

export const ROLE_LABELS: Readonly<Record<TeamRole, string>> = {
  owner: 'Propietario',
  admin: 'Administrador',
  member: 'Miembro',
  viewer: 'Visualizador',
}

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as TeamRole] ?? role
}
