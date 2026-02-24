'use client'

import Link from 'next/link'
import { FileText, UserPlus, CalendarPlus } from 'lucide-react'

interface QuickActionsListProps {
  onActionClick?: () => void
  variant?: 'horizontal' | 'vertical'
  className?: string
}

const actions = [
  {
    id: 'quote',
    label: '+ Cotización',
    href: '/dashboard/quotes/new',
    icon: FileText,
  },
  {
    id: 'client',
    label: '+ Cliente',
    href: '/dashboard/clients/new',
    icon: UserPlus,
  },
  {
    id: 'event',
    label: '+ Evento',
    href: '/dashboard/calendar/new',
    icon: CalendarPlus,
  },
]

export function QuickActionsList({
  onActionClick,
  variant = 'horizontal',
  className = '',
}: QuickActionsListProps) {
  return (
    <div
      className={
        variant === 'horizontal'
          ? `flex items-center gap-3 ${className}`
          : `flex flex-col gap-2 ${className}`
      }
    >
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.id}
            href={action.href}
            onClick={() => onActionClick?.()}
            className={
              variant === 'horizontal'
                ? 'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 rounded-md hover:bg-gray-100 transition-colors'
                : 'flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-900 rounded-lg hover:bg-gray-50 transition-colors'
            }
          >
            <Icon className="w-4 h-4" />
            <span>{action.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
