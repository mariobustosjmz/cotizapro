import { z } from 'zod'
import { PLANS } from '@/lib/plans/catalog'

export const ADMIN_PAGE_SIZE = 25

/** z.guid(): los ids demo (00000000-0000-0000-00c0-…) no cumplen la versión RFC que exige z.uuid(). */
export const organizationIdSchema = z.guid()

export const listOrganizationsQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  page: z.coerce.number().int().min(1).max(1000).default(1),
})

export const activatePlanSchema = z
  .object({
    plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
    users: z.coerce.number().int().min(1, 'Mínimo 1 usuario').max(500, 'Máximo 500 usuarios'),
    months: z.coerce.number().int().min(1, 'Mínimo 1 mes').max(12, 'Máximo 12 meses'),
    reference: z.string().trim().max(120, 'Máximo 120 caracteres').default(''),
  })
  .superRefine((value, ctx) => {
    const plan = PLANS[value.plan]
    if (value.plan !== 'free' && value.reference.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['reference'], message: 'Escribe la referencia del pago de Mercado Pago' })
    }
    if (!plan.allowsExtraUsers && value.users > plan.includedUsers) {
      ctx.addIssue({ code: 'custom', path: ['users'], message: `El plan ${plan.name} es para ${plan.includedUsers} usuario` })
    }
  })

export const suspendPlanSchema = z.object({
  reason: z.string().trim().min(3, 'Escribe el motivo').max(300, 'Máximo 300 caracteres'),
})
