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
    <ul
      className={
        variant === 'horizontal'
          ? `flex items-center gap-3 ${className}`
          : `flex flex-col gap-2 ${className}`
      }
    >
      {actions.map((action) => {
        const Icon = action.icon
        return (
          <li key={action.id}>
            <Link
              href={action.href}
              onClick={() => onActionClick?.()}
              aria-label={
                action.id === 'quote'
                  ? 'Nueva cotización'
                  : action.id === 'client'
                    ? 'Nuevo cliente'
                    : 'Nuevo evento'
              }
              className={
                variant === 'horizontal'
                  ? 'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                  : 'flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              }
            >
              <Icon className="w-4 h-4" />
              <span>{action.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
