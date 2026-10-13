import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { OrgBranding } from '@/lib/branding/types'
import { BrandMark } from '@/components/brand/brand-mark'

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')
}

/** Encabezado de la barra lateral con la identidad de la empresa; CotizaPro queda como firma. */
export function SidebarBrand({ branding, isCollapsed }: { readonly branding: OrgBranding; readonly isCollapsed: boolean }) {
  return (
    <Link
      href="/dashboard"
      data-testid="sidebar-brand"
      className={cn('flex items-center gap-2.5 px-4 min-w-0', isCollapsed && 'justify-center px-0 w-full')}
    >
      {branding.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo de la empresa servido desde Storage
        <img src={branding.logoUrl} alt={`Logo de ${branding.name}`} className="w-8 h-8 shrink-0 rounded-lg object-contain bg-white p-0.5" />
      ) : (
        <span className="w-8 h-8 shrink-0 rounded-lg grid place-items-center text-sm font-bold bg-[var(--brand)] text-[var(--brand-ink)]">
          {initials(branding.name)}
        </span>
      )}
      {!isCollapsed && (
        <span className="min-w-0">
          <span className="block text-[14px] font-semibold text-white tracking-tight truncate">{branding.name}</span>
          <span className="flex items-center gap-1 text-[10px] text-white/40">
            <BrandMark size={11} /> con CotizaPro
          </span>
        </span>
      )}
    </Link>
  )
}
