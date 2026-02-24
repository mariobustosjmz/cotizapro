import { ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'

// Fixed widths to avoid Math.random() in server components
const SKELETON_WIDTHS = ['75%', '55%', '45%', '65%', '50%', '70%', '60%']

interface DataTableProps {
  children: ReactNode
  className?: string
}

export function DataTable({ children, className = '' }: DataTableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        {children}
      </table>
    </div>
  )
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-gray-50">
      <tr>{children}</tr>
    </thead>
  )
}

export function DataTableHeadCell({
  children,
  align = 'left',
}: {
  children: ReactNode
  align?: 'left' | 'right' | 'center'
}) {
  const alignClass =
    align === 'right'
      ? 'text-right'
      : align === 'center'
        ? 'text-center'
        : 'text-left'
  return (
    <th
      className={`px-6 py-3 ${alignClass} text-xs font-medium text-gray-500 uppercase tracking-wider`}
    >
      {children}
    </th>
  )
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
  )
}

export function DataTableRow({
  children,
  highlighted = false,
}: {
  children: ReactNode
  highlighted?: boolean
}) {
  return (
    <tr className={`hover:bg-gray-50 transition-colors ${highlighted ? 'bg-red-50' : ''}`}>
      {children}
    </tr>
  )
}

export function DataTableCell({
  children,
  align = 'left',
  className = '',
}: {
  children: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}) {
  const alignClass =
    align === 'right'
      ? 'text-right'
      : align === 'center'
        ? 'text-center'
        : 'text-left'
  return (
    <td className={`px-6 py-4 whitespace-nowrap ${alignClass} ${className}`}>
      {children}
    </td>
  )
}

interface DataTableEmptyProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function DataTableEmpty({ icon: Icon, title, description, action }: DataTableEmptyProps) {
  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

interface DataTableSkeletonProps {
  columns: number
  rows?: number
}

export function DataTableSkeleton({ columns, rows = 5 }: DataTableSkeletonProps) {
  return (
    <div className="overflow-x-auto animate-pulse">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <div className="h-3 bg-gray-200 rounded" style={{ width: SKELETON_WIDTHS[i % SKELETON_WIDTHS.length] }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-6 py-4">
                  <div
                    className="h-4 bg-gray-100 rounded"
                    style={{ width: SKELETON_WIDTHS[(rowIdx + colIdx) % SKELETON_WIDTHS.length] }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
