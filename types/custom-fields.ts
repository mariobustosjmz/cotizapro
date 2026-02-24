export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'url'
  | 'phone'
  | 'email'

export type EntityType = 'client' | 'service' | 'quote'

export interface SelectOption {
  value: string
  label: string
}

export interface CustomFieldDefinition {
  id: string
  organization_id: string
  entity_type: EntityType
  field_key: string
  field_label: string
  field_type: FieldType
  is_required: boolean
  is_active: boolean
  options: SelectOption[] | null
  placeholder: string | null
  default_value: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type CustomFieldValues = Record<string, string | number | boolean | null>
