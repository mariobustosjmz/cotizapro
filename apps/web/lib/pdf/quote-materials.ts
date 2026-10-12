import { z } from 'zod'
import { aggregateMaterials } from '@cotizapro/quoting'
import type { BreakdownLine } from '@cotizapro/quoting'

export interface MaterialLine {
  readonly label: string
  readonly quantity: string
}

const breakdownSchema = z.object({
  lines: z.array(
    z.object({
      kind: z.string(),
      label: z.string(),
      unit: z.string(),
      quantity: z.number(),
    }),
  ),
})

export const ITEM_UNIT_LABEL: Readonly<Record<string, string>> = {
  fixed: 'Servicio',
  per_hour: 'Hora',
  per_sqm: 'm²',
  per_unit: 'Pieza',
  per_lm: 'm lineal',
}

/** Suma materiales y accesorios de las partidas configurables; las partidas sin desglose se ignoran. */
export function materialsFromItems(items: readonly { readonly breakdown?: unknown }[]): readonly MaterialLine[] {
  const breakdowns = items.flatMap((item) => {
    const parsed = breakdownSchema.safeParse(item.breakdown)
    return parsed.success ? [parsed.data.lines as unknown as readonly BreakdownLine[]] : []
  })
  return aggregateMaterials(breakdowns).map((m) => ({
    label: m.label,
    quantity: `${m.quantity.toLocaleString('es-MX', { maximumFractionDigits: 2 })} ${m.unit}`,
  }))
}
