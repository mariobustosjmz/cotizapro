import { z } from 'zod'

const dimensionKey = z.string().regex(/^[a-z][a-z0-9_]{0,39}$/, 'Usa minúsculas, números y guion bajo')

export const priceListRowInputSchema = z.object({
  keys: z.record(z.string(), z.string().trim().min(1).max(60)),
  price: z.number().min(0, 'El precio no puede ser negativo').max(10_000_000, 'Precio demasiado alto'),
})

export const createPriceListSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es requerido').max(80, 'Nombre muy largo'),
    unit: z.enum(['sqm', 'lm', 'unit', 'hour', 'fixed']),
    dimensions: z.array(dimensionKey).min(1, 'Agrega al menos una dimensión').max(4, 'Máximo 4 dimensiones'),
    rows: z.array(priceListRowInputSchema).max(2000, 'Máximo 2000 filas'),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>()
    value.rows.forEach((row, index) => {
      const missing = value.dimensions.filter((d) => !row.keys[d])
      if (missing.length > 0) {
        ctx.addIssue({ code: 'custom', path: ['rows', index], message: `Fila ${index + 1}: falta ${missing.join(', ')}` })
      }
      const id = value.dimensions.map((d) => row.keys[d] ?? '').join('|')
      if (seen.has(id)) ctx.addIssue({ code: 'custom', path: ['rows', index], message: `Fila ${index + 1}: combinación repetida` })
      seen.add(id)
    })
  })

export const updatePriceListSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  rows: z.array(priceListRowInputSchema).max(2000).optional(),
  is_active: z.boolean().optional(),
  /** Ajuste masivo de precios en porcentaje, p. ej. 8 = +8 %. Se aplica después de `rows`. */
  adjust_percent: z.number().min(-90).max(500).optional(),
})

export const pricingPreviewSchema = z.object({
  service_id: z.string().uuid('Servicio inválido').optional(),
  definition: z.unknown().optional(),
  name: z.string().max(200).optional(),
  input: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
})

export type CreatePriceListInput = z.infer<typeof createPriceListSchema>
export type UpdatePriceListInput = z.infer<typeof updatePriceListSchema>
