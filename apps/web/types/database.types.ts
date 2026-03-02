// CotizaPro Database Types
// Auto-generated from Supabase schema

export type Client = {
  id: string
  organization_id: string
  name: string
  email: string | null
  phone: string
  whatsapp_phone: string | null
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  notes: string | null
  tags: string[] | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ServiceCategory = 'hvac' | 'painting' | 'plumbing' | 'electrical' | 'other'

export type UnitType = 'fixed' | 'per_hour' | 'per_sqm' | 'per_unit'

export type ServiceCatalog = {
  id: string
  organization_id: string
  name: string
  category: ServiceCategory
  description: string | null
  unit_price: number
  unit_type: UnitType
  estimated_duration_minutes: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired'

export type Quote = {
  id: string
  organization_id: string
  quote_number: string
  client_id: string
  status: QuoteStatus
  valid_until: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_rate: number
  discount_amount: number
  total: number
  notes: string | null
  terms_and_conditions: string | null
  created_by: string | null
  sent_at: string | null
  sent_via: string[] | null
  viewed_at: string | null
  accepted_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export type QuoteItem = {
  id: string
  quote_id: string
  service_id: string | null
  description: string
  quantity: number
  unit_price: number
  unit_type: UnitType
  subtotal: number
  sort_order: number
  created_at: string
}

export type QuoteWithItems = Quote & {
  items: QuoteItem[]
  client: Client
}

export type QuoteWithDetails = Quote & {
  items: QuoteItem[]
  client: Client
  notifications: QuoteNotification[]
}

export type NotificationType = 'email' | 'whatsapp'
export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'read'

export type QuoteNotification = {
  id: string
  quote_id: string
  notification_type: NotificationType
  recipient: string
  status: NotificationStatus
  provider_message_id: string | null
  error_message: string | null
  sent_at: string
  delivered_at: string | null
  read_at: string | null
}

// ========================================
// Follow-Up Reminders
// ========================================

export type ReminderType = 'maintenance' | 'follow_up' | 'renewal' | 'custom'
export type ReminderStatus = 'pending' | 'sent' | 'completed' | 'snoozed' | 'cancelled'
export type ReminderPriority = 'low' | 'normal' | 'high' | 'urgent'

export type FollowUpReminder = {
  id: string
  organization_id: string
  client_id: string
  title: string
  description: string | null
  reminder_type: ReminderType
  scheduled_date: string // DATE
  completed_at: string | null
  snoozed_until: string | null // DATE
  status: ReminderStatus
  priority: ReminderPriority
  auto_send_notification: boolean
  notification_channels: string[] | null
  notification_sent_at: string | null
  related_quote_id: string | null
  related_service_category: ServiceCategory | null
  is_recurring: boolean
  recurrence_interval_months: number | null
  next_occurrence_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ReminderWithClient = FollowUpReminder & {
  client: Client
}

export type DueReminder = {
  id: string
  client_id: string
  client_name: string
  title: string
  scheduled_date: string
  priority: ReminderPriority
  reminder_type: ReminderType
  days_until_due: number
}

// API Response types
export type PaginatedResponse<T> = {
  data: T[]
  total: number
  limit: number
  offset: number
}

export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
  details?: unknown
}

// Client with quote stats
export type ClientWithStats = Client & {
  quote_count: number
  total_quoted: number
  last_quote_date: string | null
}

// Quote list item (for table views)
export type QuoteListItem = Quote & {
  client: Pick<Client, 'id' | 'name' | 'email' | 'phone'>
  item_count: number
}
