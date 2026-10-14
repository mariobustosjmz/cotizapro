'use client'

import { ExternalLink, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMxn } from '@/lib/plans/pricing'
import type { PlanId } from '@/lib/plans/types'
import type { PlanCheckoutOption } from '@/lib/billing/types'

interface PlanCtaProps {
  readonly planId: PlanId
  readonly option: PlanCheckoutOption
  readonly canManage: boolean
  readonly loading: boolean
  readonly onSelectPlan: (planId: PlanId) => Promise<void>
}

const LINK_CLASS =
  'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600'

const STATIC_LABELS: Readonly<Partial<Record<PlanCheckoutOption['kind'], string>>> = {
  current: 'Plan actual',
  included: 'Incluido',
  too_small: 'No alcanza para tu equipo',
  unavailable: 'Próximamente',
}

function WhatsappCta({ url, total }: { readonly url: string | null; readonly total: number }) {
  return (
    <div className="mt-4 space-y-2 text-center">
      <p className="text-xs text-gray-600 dark:text-gray-300">Te mandamos tu liga con el total exacto: {formatMxn(total)}/mes</p>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Pedir mi liga por WhatsApp
        </a>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">Escríbenos a soporte para recibir tu liga.</p>
      )}
    </div>
  )
}

export function PlanCta({ planId, option, canManage, loading, onSelectPlan }: PlanCtaProps) {
  const staticLabel = STATIC_LABELS[option.kind]
  if (staticLabel) {
    return (
      <Button variant={option.kind === 'current' ? 'outline' : 'default'} disabled className="w-full mt-4">
        {staticLabel}
      </Button>
    )
  }
  if (!canManage) {
    return <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">Pide al propietario que contrate el plan</p>
  }
  if (option.kind === 'stripe') {
    return (
      <Button onClick={() => onSelectPlan(planId)} disabled={loading} className="w-full mt-4">
        Elegir plan
      </Button>
    )
  }
  if (option.kind === 'mercadopago') {
    return (
      <a href={option.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS} data-testid={`mp-link-${planId}`}>
        {option.renewing ? 'Renovar con Mercado Pago' : 'Contratar con Mercado Pago'}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    )
  }
  if (option.kind === 'whatsapp') return <WhatsappCta url={option.url} total={option.total} />
  return null
}
