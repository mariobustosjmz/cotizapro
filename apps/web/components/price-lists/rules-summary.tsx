import type { PriceList, ProductDefinition } from '@cotizapro/quoting'
import { describeBlocks, describeInputs } from '@/lib/pricing/describe-rules'
import type { RuleLine } from '@/lib/pricing/describe-rules'

interface RulesSummaryProps {
  readonly definition: ProductDefinition
  readonly priceLists: readonly PriceList[]
}

function RuleList({ title, lines, ordered }: { readonly title: string; readonly lines: readonly RuleLine[]; readonly ordered: boolean }) {
  const ListTag = ordered ? 'ol' : 'ul'
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">{title}</h4>
      <ListTag className={`space-y-1 text-xs ${ordered ? 'list-decimal pl-4' : ''}`}>
        {lines.map((line) => (
          <li key={line.key} className="text-gray-700 dark:text-gray-300">
            <span className="font-medium text-gray-900 dark:text-gray-100">{line.label}</span>
            <span className="text-gray-500 dark:text-gray-400"> — {line.detail}</span>
          </li>
        ))}
      </ListTag>
    </div>
  )
}

export function RulesSummary({ definition, priceLists }: RulesSummaryProps) {
  return (
    <details className="group rounded-lg border border-gray-200 dark:border-gray-700" data-testid="rules-summary">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-medium text-orange-600 dark:text-orange-400">Ver reglas</summary>
      <div className="space-y-3 px-3 pb-3">
        <RuleList title="Datos que se capturan" lines={describeInputs(definition, priceLists)} ordered={false} />
        <RuleList title="Cálculo, en orden" lines={describeBlocks(definition, priceLists)} ordered />
        <p className="text-[11px] text-gray-400 dark:text-gray-500">Las reglas se consultan aquí; su edición no está disponible todavía.</p>
      </div>
    </details>
  )
}
