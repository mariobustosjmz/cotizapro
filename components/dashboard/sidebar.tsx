'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  Bell,
  Briefcase,
  BarChart3,
  UsersRound,
  Settings2,
  Sliders,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  UserCircle,
  Settings,
  Calendar as CalendarIcon,
  Copy as TemplateIcon,
} from 'lucide-react'

interface ProfileOrganization {
  name: string | null
}

interface SidebarProfile {
  email: string | null
  full_name: string | null
  organizations: unknown
}

interface SidebarProps {
  user: User
  profile: SidebarProfile
}

const principalNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortcut: 'G D' },
  { name: 'Clientes', href: '/dashboard/clients', icon: Users, shortcut: 'G C' },
  { name: 'Cotizaciones', href: '/dashboard/quotes', icon: FileText, shortcut: 'G Q' },
  { name: 'Recordatorios', href: '/dashboard/reminders', icon: Bell, shortcut: 'G R' },
  { name: 'Agenda', href: '/dashboard/calendar', icon: CalendarIcon, shortcut: 'G A' },
  { name: 'Servicios', href: '/dashboard/services', icon: Briefcase, shortcut: 'G S' },
  { name: 'Templates', href: '/dashboard/templates', icon: TemplateIcon, shortcut: 'G T' },
]

const analyticsNav = [
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, shortcut: '' },
]

const configNav = [
  { name: 'Equipo', href: '/dashboard/team', icon: UsersRound, shortcut: '' },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings2, shortcut: '' },
  { name: 'Campos Extra', href: '/dashboard/settings/custom-fields', icon: Sliders, shortcut: '' },
]

function getInitials(email: string | null, fullName: string | null): string {
  if (fullName) {
    const parts = fullName.trim().split(' ')
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return 'CP'
}

interface NavItemProps {
  item: { name: string; href: string; icon: React.ElementType; shortcut: string }
  isActive: boolean
  isCollapsed: boolean
}

function NavItem({ item, isActive, isCollapsed }: NavItemProps) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-label={isCollapsed ? item.name : undefined}
      aria-current={isActive ? 'page' : undefined}
      title={isCollapsed ? item.name : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-orange-500/10 text-orange-400 border-l-2 border-orange-500 pl-[9px]'
          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border-l-2 border-transparent pl-[9px]',
        isCollapsed && 'justify-center px-0 pl-0 border-l-0'
      )}
    >
      <Icon
        className={cn(
          'w-[18px] h-[18px] shrink-0 transition-colors',
          isActive ? 'text-orange-400' : 'text-white/40 group-hover:text-white/60'
        )}
      />
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate">{item.name}</span>
          {item.shortcut && (
            <span className="text-[10px] text-white/20 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
              {item.shortcut}
            </span>
          )}
        </>
      )}
    </Link>
  )
}

interface NavSectionProps {
  label: string
  items: { name: string; href: string; icon: React.ElementType; shortcut: string }[]
  pathname: string
  isCollapsed: boolean
  className?: string
}

function NavSection({ label, items, pathname, isCollapsed, className }: NavSectionProps) {
  return (
    <div className={className}>
      {!isCollapsed && (
        <p className="px-3 mb-1.5 text-[10px] font-semibold text-white/25 uppercase tracking-widest">
          {label}
        </p>
      )}
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <NavItem
              key={item.name}
              item={item}
              isActive={isActive}
              isCollapsed={isCollapsed}
            />
          )
        })}
      </div>
    </div>
  )
}

export function DashboardSidebar({ user, profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const orgName =
    (profile.organizations as ProfileOrganization | null)?.name ?? 'Mi Organización'
  const initials = getInitials(user.email ?? null, profile.full_name)
  const displayName = profile.full_name ?? user.email ?? 'Usuario'

  // Restore collapsed state from localStorage; auto-collapse below 1280px
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') setIsCollapsed(true)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setIsCollapsed(true)
        localStorage.setItem('sidebar-collapsed', 'true')
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleCollapsed = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  // Close user menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [userMenuOpen])

  // Close user menu on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = async () => {
    setUserMenuOpen(false)
    const response = await fetch('/api/auth/logout', { method: 'POST' })
    if (response.ok) router.push('/login')
  }

  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        'bg-[#0F1117] flex flex-col shrink-0 transition-all duration-200 relative',
        isCollapsed ? 'w-[64px]' : 'w-[240px]'
      )}
    >
      {/* Logo area */}
      <div className="h-16 flex items-center border-b border-white/[0.06] shrink-0 overflow-hidden">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2.5 px-4 min-w-0',
            isCollapsed && 'justify-center px-0 w-full'
          )}
        >
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">
            C
          </div>
          {!isCollapsed && (
            <span className="text-[15px] font-semibold text-white tracking-tight truncate">
              CotizaPro
            </span>
          )}
        </Link>
      </div>

      {/* Quick action — Nueva Cotización */}
      <div className={cn('px-3 pt-4 pb-2 shrink-0', isCollapsed && 'px-2')}>
        <Link
          href="/dashboard/quotes/new"
          title={isCollapsed ? 'Nueva Cotización' : undefined}
          className={cn(
            'flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm rounded-lg transition-colors',
            isCollapsed
              ? 'justify-center w-full h-9'
              : 'px-3 py-2'
          )}
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Nueva Cotización</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={cn('flex-1 overflow-y-auto py-2', isCollapsed ? 'px-2' : 'px-3')}>
        <NavSection
          label="Principal"
          items={principalNav}
          pathname={pathname}
          isCollapsed={isCollapsed}
        />
        <NavSection
          label="Análisis"
          items={analyticsNav}
          pathname={pathname}
          isCollapsed={isCollapsed}
          className="mt-5"
        />
        <NavSection
          label="Configuración"
          items={configNav}
          pathname={pathname}
          isCollapsed={isCollapsed}
          className="mt-5"
        />
      </nav>

      {/* User section */}
      <div className="shrink-0 border-t border-white/[0.06]">
        {/* Collapse toggle */}
        <div className={cn('px-3 py-2', isCollapsed && 'px-2 flex justify-center')}>
          <button
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            title={isCollapsed ? 'Expandir barra' : 'Colapsar barra'}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors text-xs w-full"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 mx-auto" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span>Colapsar</span>
              </>
            )}
          </button>
        </div>

        {/* User menu trigger */}
        <div className={cn('px-3 pb-4', isCollapsed && 'px-2 flex justify-center')} ref={userMenuRef}>
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              aria-label={`Menú de usuario: ${displayName}`}
              title={isCollapsed ? displayName : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md hover:bg-white/[0.06] transition-colors w-full',
                isCollapsed ? 'justify-center p-1.5' : 'px-2 py-2'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                {initials}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-white/80 truncate">{displayName}</p>
                  <p className="text-[10px] text-white/35 truncate">{orgName}</p>
                </div>
              )}
            </button>

            {/* Dropdown menu */}
            {userMenuOpen && (
              <div
                role="menu"
                aria-label="Opciones de usuario"
                className={cn(
                  'absolute bottom-full mb-2 bg-[#1a1e2e] border border-white/[0.08] rounded-lg shadow-lg py-1 z-50 min-w-[180px]',
                  isCollapsed ? 'left-0' : 'left-0 right-0'
                )}
              >
                <div className="px-3 py-2 border-b border-white/[0.06] mb-1" aria-hidden="true">
                  <p className="text-xs font-medium text-white/80 truncate">{displayName}</p>
                  <p className="text-[10px] text-white/35 truncate">{user.email}</p>
                </div>
                <Link
                  href="/dashboard/settings"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <UserCircle className="w-4 h-4" aria-hidden="true" />
                  Perfil
                </Link>
                <Link
                  href="/dashboard/settings"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <Settings className="w-4 h-4" aria-hidden="true" />
                  Configuración
                </Link>
                <div className="border-t border-white/[0.06] mt-1 pt-1">
                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
