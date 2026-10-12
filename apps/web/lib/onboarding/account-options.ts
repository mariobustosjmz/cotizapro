import type { AccountType } from '@/lib/validations/onboarding'

export interface AccountTypeOption {
  readonly value: AccountType
  readonly title: string
  readonly description: string
}

export const ACCOUNT_TYPE_OPTIONS: readonly AccountTypeOption[] = [
  { value: 'person', title: 'Por mi cuenta', description: 'Trabajo solo: oficio, servicio o emprendimiento personal.' },
  { value: 'group', title: 'Con un equipo', description: 'Cuadrilla, taller o grupo pequeño que trabaja junto.' },
  { value: 'company', title: 'Como empresa', description: 'Negocio establecido con personal, ventas e instalación.' },
]

export const ACCOUNT_TYPE_LABEL: Readonly<Record<AccountType, string>> = {
  person: 'Profesional independiente',
  group: 'Equipo de trabajo',
  company: 'Empresa',
}
