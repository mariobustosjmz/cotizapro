import { AI_FEATURES, AI_FEATURE_ORDER, creditsLabel, isAiFeatureId } from '@/lib/ai/features'
import type { PackLink } from '@/lib/ai/packs'
import { formatResetDate } from '@/lib/ai/period'
import type { AiUsageSummary } from '@/lib/ai/usage'
import { GetMoreCredits } from './get-more-credits'

interface AiUsageCardProps {
  readonly summary: AiUsageSummary | null
  readonly links: readonly PackLink[]
  readonly canBuy: boolean
}

const day = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', timeZone: 'America/Monterrey' })
const formatNumber = (value: number): string => value.toLocaleString('es-MX')

function barColor(percent: number): string {
  if (percent >= 100) return 'bg-red-500'
  if (percent >= 80) return 'bg-amber-500'
  return 'bg-orange-500'
}

function Breakdown({ summary }: { readonly summary: AiUsageSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 text-xs">
      <ul className="space-y-1" aria-label="Créditos por función">
        {summary.by_feature.length === 0 && <li className="text-gray-500 dark:text-gray-400">Aún no usas la IA este mes.</li>}
        {summary.by_feature.map((row) => (
          <li key={row.feature} className="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{isAiFeatureId(row.feature) ? AI_FEATURES[row.feature].label : row.feature}</span>
            <span className="tabular-nums">{creditsLabel(row.credits)}</span>
          </li>
        ))}
      </ul>
      <ul className="space-y-1" aria-label="Paquetes vigentes">
        {summary.packs.map((pack) => (
          <li key={`${pack.expires_at}-${pack.credits}`} className="flex justify-between text-gray-700 dark:text-gray-300">
            <span>{pack.source === 'pack' ? 'Paquete' : 'Cortesía'} +{formatNumber(pack.credits)}</span>
            <span>vigente hasta el {day.format(new Date(Date.parse(pack.expires_at) - 1))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function UsageBody({ summary }: { readonly summary: AiUsageSummary }) {
  const total = summary.allowance + summary.pack_credits
  return (
    <>
      <div className="flex items-baseline justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span id="ai-usage-label">Tu uso del mes · Se reinicia el {formatResetDate(summary.resets_on)}</span>
        <span className="font-semibold text-gray-900 dark:text-white" data-testid="ai-usage-percent">{summary.percent} % usado</span>
      </div>
      <div
        className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={summary.percent}
        aria-valuetext={`${summary.percent} % usado`}
        aria-labelledby="ai-usage-label"
      >
        <div className={`h-full ${barColor(summary.percent)}`} style={{ width: `${summary.percent}%` }} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {formatNumber(summary.used)} de {formatNumber(total)} créditos
        {summary.pack_credits > 0 ? ` (incluye ${formatNumber(summary.pack_credits)} de paquetes)` : ''}
      </p>
      <Breakdown summary={summary} />
    </>
  )
}

function CostTable() {
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-orange-600 dark:text-orange-400">¿Qué funciones usan créditos?</summary>
      <table className="mt-2 w-full">
        <tbody>
          {AI_FEATURE_ORDER.map((id) => (
            <tr key={id} className="border-t border-gray-100 dark:border-gray-800">
              <td className="py-1 text-gray-700 dark:text-gray-300">
                {AI_FEATURES[id].label}
                <span className="block text-[11px] text-gray-500 dark:text-gray-400">{AI_FEATURES[id].description}</span>
              </td>
              <td className="py-1 text-right tabular-nums text-gray-900 dark:text-white">{creditsLabel(AI_FEATURES[id].credits)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}

export function AiUsageCard({ summary, links, canBuy }: AiUsageCardProps) {
  return (
    <section id="ia" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3" data-testid="ai-usage-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Uso de IA</h3>
        {canBuy && <GetMoreCredits links={links} />}
      </div>
      {summary ? <UsageBody summary={summary} /> : <p className="text-sm text-gray-500 dark:text-gray-400">No se pudo cargar el uso de IA. Intenta más tarde.</p>}
      <CostTable />
    </section>
  )
}
