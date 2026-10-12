import type { BreakdownLine } from '@cotizapro/quoting'
import { formatMoney } from '@/lib/pricing/client-preview'

const KIND_LABEL: Readonly<Record<BreakdownLine['kind'], string>> = {
  material: 'Material',
  process: 'Proceso',
  accessory: 'Accesorio',
  labor: 'Mano de obra',
  adjustment: 'Ajuste',
}

interface BreakdownTableProps {
  readonly lines: readonly BreakdownLine[]
  readonly subtotalCents: number
}

function formatQuantity(quantity: number): string {
  return quantity.toLocaleString('es-MX', { maximumFractionDigits: 3 })
}

export function BreakdownTable({ lines, subtotalCents }: BreakdownTableProps) {
  return (
    <table className="w-full text-xs" data-testid="breakdown-table">
      <thead>
        <tr className="text-left text-gray-400 dark:text-gray-500">
          <th className="py-1 font-medium">Concepto</th>
          <th className="py-1 font-medium text-right">Cantidad</th>
          <th className="py-1 font-medium text-right">Precio</th>
          <th className="py-1 font-medium text-right">Importe</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {lines.map((line) => (
          <tr key={`${line.label}-${line.kind}`} className="text-gray-700 dark:text-gray-300">
            <td className="py-1">
              {line.label}
              <span className="ml-1.5 text-[10px] text-gray-400">{KIND_LABEL[line.kind]}</span>
            </td>
            <td className="py-1 text-right tabular-nums">
              {formatQuantity(line.quantity)} {line.unit}
            </td>
            <td className="py-1 text-right tabular-nums">{formatMoney(line.unitPriceCents)}</td>
            <td className="py-1 text-right tabular-nums">{formatMoney(line.amountCents)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="font-semibold text-gray-900 dark:text-white">
          <td className="pt-1.5" colSpan={3}>
            Subtotal de la partida
          </td>
          <td className="pt-1.5 text-right tabular-nums" data-testid="breakdown-subtotal">
            {formatMoney(subtotalCents)}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}
