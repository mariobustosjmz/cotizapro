import { z } from 'zod'

/**
 * Profile update schema
 * Validates fields updatable by the user about their profile
 */
export const updateProfileSchema = z.object({
  full_name: z.string().max(200, 'El nombre es muy largo').nullable().optional(),
  avatar_url: z.string().url('URL de avatar inválida').nullable().optional(),
})

/**
 * Organization update schema
 * Validates organization-level settings (only owner/admin can update)
 */
export const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'El nombre de la empresa es requerido').max(255, 'El nombre es muy largo'),
  company_address: z.string().max(500, 'La dirección es muy larga').nullable().optional(),
  company_phone: z.string().max(20, 'El teléfono es muy largo').nullable().optional(),
  company_email: z.string().email('Email inválido').nullable().optional(),
  quote_terms: z.string().max(2000, 'Los términos son muy largos').nullable().optional(),
  quote_valid_days: z.number().min(1, 'Debe ser al menos 1 día').max(365, 'No puede exceder 365 días').nullable().optional(),
  tax_rate: z.number().min(0, 'La tasa no puede ser negativa').max(100, 'La tasa no puede exceder 100').nullable().optional(),
  logo_url: z.string().url('URL de logo inválida').max(500).nullable().optional(),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser formato hex (#RRGGBB)').nullable().optional(),
})

/**
 * Password change schema
 * Validates password update request
 */
export const changePasswordSchema = z.object({
  new_password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'La contraseña debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'La contraseña debe contener al menos una minúscula')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'La contraseña debe contener al menos un carácter especial'),
})
