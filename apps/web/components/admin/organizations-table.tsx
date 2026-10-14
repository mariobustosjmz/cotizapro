import { PLANS, isPlanId } from '@/lib/plans/catalog'
import { billingState, formatExpiryDate } from '@/lib/billing/expiry'
import { adminExpiryLabel } from '@/lib/billing/expiry-copy'
import type { AdminOrganizationRow } from '@/lib/admin/types'
import { OrganizationActions } from './organization-actions'

const TH = 'px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400'
const TD = 'px-3 py-2 align-top text-gray-700 dark:text-gray-300'

function OrganizationRow({ row, now }: { readonly row: AdminOrganizationRow; readonly now: Date }) {
  const planId = isPlanId(row.plan) ? row.plan : 'free'
  const state = billingState({ planId, currentPeriodEnd: row.current_period_end }, now)
  const expiryClass = state.kind === 'expired' ? 'font-semibold text-red-600 dark:text-red-400' : ''
  return (
    <tr data-testid={`org-row-${row.id}`} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
      <td className={TD}>
        <p className="font-medium text-gray-900 dark:text-white">{row.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{row.slug}</p>
      </td>
      <td className={TD}>{PLANS[planId].name}</td>
      <td className={`${TD} ${expiryClass}`}>{adminExpiryLabel(state)}</td>
      <td className={TD}>{row.member_count}</td>
      <td className={TD}>{formatExpiryDate(row.created_at)}</td>
      <td className={`${TD} text-right`}>
        <OrganizationActions organization={{ id: row.id, name: row.name, planId, memberCount: row.member_count }} />
      </td>
    </tr>
  )
}

export function OrganizationsTable({ rows, now }: { readonly rows: readonly AdminOrganizationRow[]; readonly now: Date }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No hay empresas que coincidan con la búsqueda.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-100 dark:border-gray-800">
          <tr>
            <th scope="col" className={TH}>Empresa</th>
            <th scope="col" className={TH}>Plan</th>
            <th scope="col" className={TH}>Vencimiento</th>
            <th scope="col" className={TH}>Usuarios</th>
            <th scope="col" className={TH}>Alta</th>
            <th scope="col" className={TH}><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => <OrganizationRow key={row.id} row={row} now={now} />)}
        </tbody>
      </table>
    </div>
  )
}
