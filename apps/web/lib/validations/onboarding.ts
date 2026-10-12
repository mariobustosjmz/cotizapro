import { z } from 'zod'

export const ACCOUNT_TYPES = ['person', 'group', 'company'] as const
export const TRADES = ['glass', 'plumbing', 'electrical', 'hvac', 'sewing', 'general'] as const

export const accountSetupSchema = z.object({
  account_type: z.enum(ACCOUNT_TYPES, { message: 'Elige cómo trabajas' }),
  trade: z.enum(TRADES, { message: 'Elige tu giro' }),
  apply_template: z.boolean().default(true),
})

export type AccountType = (typeof ACCOUNT_TYPES)[number]
export type Trade = (typeof TRADES)[number]
export type AccountSetupInput = z.infer<typeof accountSetupSchema>
