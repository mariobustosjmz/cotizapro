import { z } from 'zod'
import type { CustomFieldDefinition } from '@/types/custom-fields'

// ========================================
// Client Schemas
// ========================================

// ========================================
// Custom Fields Schema Builder
// ========================================

export function buildCustomFieldsSchema(fields: CustomFieldDefinition[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const field of fields.filter(f => f.is_active)) {
    let fieldSchema: z.ZodTypeAny
    switch (field.field_type) {
      case 'number':
        fieldSchema = z.coerce.number()
        break
      case 'checkbox':
        fieldSchema = z.coerce.boolean()
        break
      case 'date':
        fieldSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
        break
      case 'email':
        fieldSchema = z.string().email('Email inválido')
        break
      case 'url':
        fieldSchema = z.string().url('URL inválida')
        break
      default:
        fieldSchema = z.string().max(1000, 'Valor demasiado largo')
    }
    shape[field.field_key] = field.is_required
      ? fieldSchema
      : fieldSchema.optional().nullable()
  }
  return z.object(shape)
}

// ========================================
// Client Schemas
// ========================================

export const createClientSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200, 'El nombre es muy largo'),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string()
    .min(10, 'Teléfono debe tener al menos 10 dígitos')
    .max(20, 'Teléfono es muy largo')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Formato de teléfono inválido')
    .optional()
    .nullable(),
  whatsapp_phone: z.string()
    .min(10)
    .max(20)
    .regex(/^[\d\s\-\+\(\)]+$/, 'Formato de teléfono inválido')
    .optional()
    .nullable(),
  address: z.string().max(500, 'Dirección muy larga').optional().nullable(),
  city: z.string().max(100, 'Ciudad muy larga').optional().nullable(),
  state: z.string().max(100, 'Estado muy largo').optional().nullable(),
  postal_code: z.string().max(10, 'Código postal muy largo').optional().nullable(),
  notes: z.string().max(2000, 'Notas muy largas').optional().nullable(),
  tags: z.array(z.string().max(50)).max(20, 'Máximo 20 etiquetas').optional().nullable(),
  custom_fields: z.record(z.string(), z.unknown()).optional().nullable(),
})

export const updateClientSchema = createClientSchema.partial()

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>

// ========================================
// Service Catalog Schemas
// ========================================

export const serviceCategoryEnum = z.enum(['hvac', 'painting', 'plumbing', 'electrical', 'other'])
export const unitTypeEnum = z.enum(['fixed', 'per_hour', 'per_sqm', 'per_unit'])

export const createServiceSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(200, 'El nombre es muy largo'),
  category: serviceCategoryEnum,
  description: z.string().max(1000, 'Descripción muy larga').optional().nullable(),
  unit_price: z.number()
    .positive('El precio debe ser mayor a 0')
    .max(999999.99, 'Precio demasiado alto'),
  unit_type: unitTypeEnum,
  estimated_duration_minutes: z.number()
    .int('La duración debe ser un número entero')
    .positive('La duración debe ser mayor a 0')
    .max(1440, 'Máximo 24 horas (1440 minutos)')
    .optional()
    .nullable(),
  is_active: z.boolean().default(true),
  custom_fields: z.record(z.string(), z.unknown()).optional().nullable(),
})

export const updateServiceSchema = createServiceSchema.partial()

export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>

// ========================================
// Quote Item Schema
// ========================================

export const quoteItemSchema = z.object({
  service_id: z.string().uuid('Service ID inválido').optional().nullable(),
  description: z.string()
    .min(1, 'La descripción es requerida')
    .max(500, 'Descripción muy larga'),
  quantity: z.number()
    .positive('La cantidad debe ser mayor a 0')
    .max(99999, 'Cantidad demasiado alta'),
  unit_price: z.number()
    .positive('El precio debe ser mayor a 0')
    .max(999999.99, 'Precio demasiado alto'),
  unit_type: unitTypeEnum,
})

export type QuoteItemInput = z.infer<typeof quoteItemSchema>

// ========================================
// Quote Schemas
// ========================================

export const createQuoteSchema = z.object({
  client_id: z.string().uuid('Cliente inválido'),
  valid_until: z.string().datetime('Fecha inválida').or(z.date()),
  items: z.array(quoteItemSchema)
    .min(1, 'Debe agregar al menos un servicio')
    .max(50, 'Máximo 50 items por cotización'),
  notes: z.string().max(2000, 'Notas muy largas').optional().nullable(),
  terms_and_conditions: z.string().max(5000, 'Términos muy largos').optional().nullable(),
  discount_rate: z.number()
    .min(0, 'El descuento no puede ser negativo')
    .max(100, 'El descuento no puede ser mayor a 100%')
    .default(0),
  custom_fields: z.record(z.string(), z.unknown()).optional().nullable(),
})

export const quoteStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'accepted',
  'rejected',
  'expired',
  'en_instalacion',
  'completado',
  'cobrado',
])

export type QuoteStatus = z.infer<typeof quoteStatusSchema>

export const quoteStatusEnum = quoteStatusSchema

export const updateQuoteSchema = z.object({
  client_id: z.string().uuid('Cliente inválido').optional(),
  valid_until: z.string().datetime('Fecha inválida').or(z.date()).optional(),
  items: z.array(quoteItemSchema)
    .min(1, 'Debe agregar al menos un servicio')
    .max(50, 'Máximo 50 items por cotización')
    .optional(),
  notes: z.string().max(2000, 'Notas muy largas').optional().nullable(),
  terms_and_conditions: z.string().max(5000, 'Términos muy largos').optional().nullable(),
  discount_rate: z.number()
    .min(0, 'El descuento no puede ser negativo')
    .max(100, 'El descuento no puede ser mayor a 100%')
    .optional(),
  status: quoteStatusEnum.optional(),
})

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>

// ========================================
// Send Quote Schema
// ========================================

export const sendMethodEnum = z.enum(['email', 'whatsapp'])

export const sendQuoteSchema = z.object({
  quote_id: z.string().uuid('Quote ID inválido'),
  send_via: z.array(sendMethodEnum)
    .min(1, 'Seleccione al menos un método de envío')
    .max(2, 'Máximo 2 métodos de envío'),
  email_override: z.string()
    .email('Email inválido')
    .optional(),
  whatsapp_override: z.string()
    .min(10, 'WhatsApp inválido')
    .max(20)
    .regex(/^[\d\s\-\+\(\)]+$/, 'Formato de WhatsApp inválido')
    .optional(),
})

export type SendQuoteInput = z.infer<typeof sendQuoteSchema>

// ========================================
// Query Parameter Schemas
// ========================================

export const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().min(0).default(0),
})

export const clientQuerySchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
})

export const serviceQuerySchema = paginationSchema.extend({
  category: serviceCategoryEnum.optional(),
  active_only: z.boolean().default(false),
})

export const quoteQuerySchema = paginationSchema.extend({
  status: quoteStatusEnum.optional(),
  client_id: z.string().uuid().optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
})

export type PaginationParams = z.infer<typeof paginationSchema>
export type ClientQueryParams = z.infer<typeof clientQuerySchema>
export type ServiceQueryParams = z.infer<typeof serviceQuerySchema>
export type QuoteQueryParams = z.infer<typeof quoteQuerySchema>

// ========================================
// Helper Functions
// ========================================

export function validateQuoteCalculations(items: QuoteItemInput[], discount_rate: number = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const discount_amount = subtotal * (discount_rate / 100)
  const subtotal_after_discount = subtotal - discount_amount
  const tax_rate = 16.00 // IVA 16%
  const tax_amount = subtotal_after_discount * (tax_rate / 100)
  const total = subtotal_after_discount + tax_amount

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount_rate,
    discount_amount: Number(discount_amount.toFixed(2)),
    tax_rate,
    tax_amount: Number(tax_amount.toFixed(2)),
    total: Number(total.toFixed(2)),
  }
}

// ========================================
// Follow-Up Reminder Schemas
// ========================================

export const reminderTypeEnum = z.enum(['maintenance', 'follow_up', 'renewal', 'custom'])
export const reminderStatusEnum = z.enum(['pending', 'sent', 'completed', 'snoozed', 'cancelled'])
export const reminderPriorityEnum = z.enum(['low', 'normal', 'high', 'urgent'])

export const createReminderSchema = z.object({
  client_id: z.string().uuid('Cliente inválido'),
  title: z.string().min(1, 'El título es requerido').max(200, 'Título muy largo'),
  description: z.string().max(1000, 'Descripción muy larga').optional().nullable(),
  reminder_type: reminderTypeEnum,
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
    .or(z.date()),
  priority: reminderPriorityEnum.default('normal'),
  auto_send_notification: z.boolean().default(false),
  notification_channels: z.array(z.enum(['email', 'whatsapp'])).optional().nullable(),
  related_quote_id: z.string().uuid().optional().nullable(),
  related_service_category: serviceCategoryEnum.optional().nullable(),
  is_recurring: z.boolean().default(false),
  recurrence_interval_months: z.number()
    .int('El intervalo debe ser un número entero')
    .positive('El intervalo debe ser mayor a 0')
    .max(60, 'Máximo 60 meses (5 años)')
    .optional()
    .nullable(),
})

export const updateReminderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  reminder_type: reminderTypeEnum.optional(),
  scheduled_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.date()).optional(),
  status: reminderStatusEnum.optional(),
  priority: reminderPriorityEnum.optional(),
  auto_send_notification: z.boolean().optional(),
  notification_channels: z.array(z.enum(['email', 'whatsapp'])).optional().nullable(),
  related_quote_id: z.string().uuid().optional().nullable(),
  related_service_category: serviceCategoryEnum.optional().nullable(),
  is_recurring: z.boolean().optional(),
  recurrence_interval_months: z.number().int().positive().max(60).optional().nullable(),
  snoozed_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.date()).optional().nullable(),
})

export const reminderQuerySchema = paginationSchema.extend({
  client_id: z.string().uuid().optional(),
  status: reminderStatusEnum.optional(),
  priority: reminderPriorityEnum.optional(),
  reminder_type: reminderTypeEnum.optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_only: z.boolean().default(false), // Solo vencidos o próximos a vencer
  days_ahead: z.number().int().min(0).max(365).default(7), // Próximos N días
})

export type CreateReminderInput = z.infer<typeof createReminderSchema>
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>
export type ReminderQueryParams = z.infer<typeof reminderQuerySchema>
