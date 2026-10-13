import { z } from 'zod'

export const checkoutSchema = z.object({
  planId: z.enum(['starter', 'pro', 'enterprise']),
})

export const portalSchema = z.object({
  returnUrl: z.string().url().optional(),
})

export type CheckoutRequest = z.infer<typeof checkoutSchema>
export type PortalRequest = z.infer<typeof portalSchema>
