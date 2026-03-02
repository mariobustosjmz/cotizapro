import { z } from 'zod'
import { PLANS } from '@/lib/stripe/index'

const planIds = Object.keys(PLANS) as Array<keyof typeof PLANS>

export const checkoutSchema = z.object({
  planId: z.enum(planIds as [string, ...string[]]),
})

export const portalSchema = z.object({
  returnUrl: z.string().url().optional(),
})

export type CheckoutRequest = z.infer<typeof checkoutSchema>
export type PortalRequest = z.infer<typeof portalSchema>
