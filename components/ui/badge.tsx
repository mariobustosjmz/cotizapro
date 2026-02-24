import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'pending'
  | 'overdue'
  | 'done'
  | 'active'
  | 'inactive'
  | 'urgent'
  | 'high'
  | 'normal'
  | 'low'
  | 'follow_up'
  | 'maintenance'
  | 'renewal'
  | 'custom'
  | 'completed'
  | 'snoozed'
  | 'cancelled'
  | 'default'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  // Quote statuses
  draft: 'bg-slate-100 text-slate-600 border border-slate-200',
  sent: 'bg-blue-50 text-blue-700 border border-blue-200',
  viewed: 'bg-purple-50 text-purple-700 border border-purple-200',
  accepted: 'bg-green-50 text-green-700 border border-green-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
  expired: 'bg-slate-100 text-slate-600 border border-slate-200',
  pending: 'bg-amber-50 text-amber-700 border border-amber-200',
  overdue: 'bg-red-50 text-red-700 border border-red-200',
  done: 'bg-green-50 text-green-700 border border-green-200',
  // Service statuses
  active: 'bg-green-50 text-green-700 border border-green-200',
  inactive: 'bg-slate-100 text-slate-500 border border-slate-200',
  // Reminder priorities
  urgent: 'bg-red-50 text-red-700 border border-red-200',
  high: 'bg-orange-50 text-orange-700 border border-orange-200',
  normal: 'bg-amber-50 text-amber-700 border border-amber-200',
  low: 'bg-slate-100 text-slate-500 border border-slate-200',
  // Reminder types
  follow_up: 'bg-blue-50 text-blue-700 border border-blue-200',
  maintenance: 'bg-amber-50 text-amber-700 border border-amber-200',
  renewal: 'bg-purple-50 text-purple-700 border border-purple-200',
  custom: 'bg-slate-100 text-slate-600 border border-slate-200',
  // Reminder statuses
  completed: 'bg-green-50 text-green-700 border border-green-200',
  snoozed: 'bg-purple-50 text-purple-700 border border-purple-200',
  cancelled: 'bg-slate-100 text-slate-600 border border-slate-200',
  default: 'bg-slate-100 text-slate-600 border border-slate-200',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
