'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { AdminOrganizationSummary } from '@/lib/admin/types'
import { ActivatePlanDialog } from './activate-plan-dialog'
import { SuspendPlanDialog } from './suspend-plan-dialog'
import { ActivationHistory } from './activation-history'
import { AiCreditsPanel } from './ai-credits-panel'

type Panel = 'activate' | 'suspend' | 'history' | 'ai' | null

export function OrganizationActions({ organization }: { readonly organization: AdminOrganizationSummary }) {
  const router = useRouter()
  const [panel, setPanel] = useState<Panel>(null)
  const close = () => setPanel(null)
  const done = () => {
    setPanel(null)
    router.refresh()
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" onClick={() => setPanel('activate')}>Activar o renovar</Button>
      <Button size="sm" variant="outline" onClick={() => setPanel('history')}>Historial</Button>
      <Button size="sm" variant="outline" onClick={() => setPanel('ai')} data-testid={`admin-ai-toggle-${organization.id}`}>Créditos de IA</Button>
      {organization.planId !== 'free' && (
        <Button size="sm" variant="outline" className="text-red-600" onClick={() => setPanel('suspend')}>Suspender</Button>
      )}
      {panel === 'activate' && <ActivatePlanDialog organization={organization} onCancel={close} onDone={done} />}
      {panel === 'suspend' && <SuspendPlanDialog organization={organization} onCancel={close} onDone={done} />}
      {panel === 'ai' && <AiCreditsPanel organizationId={organization.id} organizationName={organization.name} onClose={close} />}
      {panel === 'history' && (
        <ActivationHistory organizationId={organization.id} organizationName={organization.name} onClose={close} />
      )}
    </div>
  )
}
