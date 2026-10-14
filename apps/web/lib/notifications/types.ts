export type BellItemKind = 'reminder' | 'email' | 'whatsapp' | 'client_response'

export interface BellItem {
  readonly id: string
  readonly type: 'reminder' | 'send'
  readonly kind: BellItemKind
  readonly title: string
  readonly subtitle: string
  readonly date: string
  readonly priority: string
  readonly read: boolean
  readonly href: string
}
