'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ChevronRight } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface HeaderProps {
  user: User
  profile: Record<string, unknown>
}

const segmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  clients: 'Clientes',
  quotes: 'Cotizaciones',
  reminders: 'Recordatorios',
  services: 'Servicios',
  analytics: 'Analytics',
  team: 'Equipo',
  settings: 'Configuración',
  'custom-fields': 'Campos Extra',
  new: 'Nuevo',
}

interface Crumb {
  label: string
  href: string
}

function buildBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: Crumb[] = []
  let path = ''

  for (const seg of segments) {
    path += `/${seg}`
    const label = segmentLabels[seg]
    if (!label) continue // skip UUIDs / dynamic segments without a label
    crumbs.push({ label, href: path })
  }

  return crumbs
}

export function DashboardHeader({ user: _user, profile: _profile }: HeaderProps) {
  const pathname = usePathname()
  const crumbs = buildBreadcrumbs(pathname)

  return (
    <header className="h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
      {/* Breadcrumbs */}
      <nav aria-label="Navegación" className="flex items-center gap-1 min-w-0">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1
          return (
            <span key={crumb.href} className="flex items-center gap-1">
              {idx > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
              )}
              {isLast ? (
                <span className="text-[15px] font-semibold text-gray-900 truncate">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          )
        })}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Notifications */}
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
