'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { useToast } from '@/components/ui/toast'
import { fetchAiUsage, postAdminAction } from '@/lib/admin/admin-api'
import { adminGrantBodySchema, formatResetDateLong } from '@/lib/admin/ai-credits'
import type { AiUsageSummary } from '@/lib/ai/usage'
import { ModalShell } from './modal-shell'

type GrantSource = 'pack' | 'courtesy'

const SOURCE_LABELS: Readonly<Record<GrantSource, string>> = { pack: 'Paquete', courtesy: 'Cortesía' }
const SOURCE_OPTIONS = (Object.keys(SOURCE_LABELS) as GrantSource[]).map((value) => ({ value, label: SOURCE_LABELS[value] }))
const QUICK_AMOUNTS = [200, 1000] as const
const LABEL = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const FIELD_ERROR = 'mt-1 text-xs text-red-600'
const CHIP = 'cursor-pointer rounded-md border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:border-orange-400 dark:border-gray-700 dark:text-gray-300'

const isGrantSource = (value: string): value is GrantSource => Object.hasOwn(SOURCE_LABELS, value)
const fmt = (n: number): string => n.toLocaleString('es-MX')

interface AiCreditsPanelProps {
  readonly organizationId: string
  readonly organizationName: string
  readonly onClose: () => void
}

type UsageState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly summary: AiUsageSummary }

function UsageSummary({ id, state }: { readonly id: string; readonly state: UsageState }) {
  if (state.status === 'loading') return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando...</p>
  if (state.status === 'error') return <p role="alert" className="text-sm text-red-600">No se pudo cargar el uso de IA.</p>
  const s = state.summary
  return (
    <dl data-testid={`admin-ai-usage-${id}`} className="grid grid-cols-2 gap-2 rounded-md bg-gray-50 p-3 text-xs dark:bg-gray-800">
      <div><dt className="text-gray-500 dark:text-gray-400">Usados</dt><dd data-testid={`admin-ai-used-${id}`} className="font-semibold text-gray-900 dark:text-white">{fmt(s.used)}</dd></div>
      <div><dt className="text-gray-500 dark:text-gray-400">Incluidos en el plan</dt><dd data-testid={`admin-ai-allowance-${id}`} className="font-semibold text-gray-900 dark:text-white">{fmt(s.allowance)}</dd></div>
      <div><dt className="text-gray-500 dark:text-gray-400">Paquetes y cortesías</dt><dd data-testid={`admin-ai-packs-${id}`} className="font-semibold text-gray-900 dark:text-white">{fmt(s.pack_credits)}</dd></div>
      <div><dt className="text-gray-500 dark:text-gray-400">Restantes</dt><dd data-testid={`admin-ai-remaining-${id}`} className="font-semibold text-gray-900 dark:text-white">{fmt(s.remaining)}</dd></div>
      <p className="col-span-2 text-gray-500 dark:text-gray-400">Se reinicia el {formatResetDateLong(s.resets_on)}</p>
    </dl>
  )
}

export function AiCreditsPanel({ organizationId, organizationName, onClose }: AiCreditsPanelProps) {
  const { toast } = useToast()
  const [usage, setUsage] = useState<UsageState>({ status: 'loading' })
  const [credits, setCredits] = useState(200)
  const [source, setSource] = useState<GrantSource>('pack')
  const [reference, setReference] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({})

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const loadUsage = useCallback(
    (isActive: () => boolean): Promise<void> =>
      fetchAiUsage(organizationId).then((summary) => {
        if (isActive()) setUsage(summary ? { status: 'ready', summary } : { status: 'error' })
      }),
    [organizationId],
  )

  useEffect(() => {
    let active = true
    loadUsage(() => active)
    return () => {
      active = false
    }
  }, [loadUsage])

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFailure(null)
    const parsed = adminGrantBodySchema.safeParse({ credits, source, reference: reference.trim() || undefined })
    if (parsed.success) {
      setErrors({})
      setConfirming(true)
      return
    }
    const flat = parsed.error.flatten().fieldErrors
    setErrors(Object.fromEntries(Object.entries(flat).flatMap(([key, msgs]) => (msgs?.[0] ? [[key, msgs[0]]] : []))))
  }

  async function grant() {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    const result = await postAdminAction(`/api/admin/organizations/${organizationId}/ai-credits`, {
      credits,
      source,
      reference: reference.trim() || undefined,
    })
    inFlight.current = false
    if (result.ok) {
      toast({ variant: 'success', message: `Se agregaron ${fmt(credits)} créditos a ${organizationName}` })
      onClose()
      return
    }
    setBusy(false)
    setConfirming(false)
    setErrors(result.fieldErrors)
    setFailure(result.error ?? 'No se pudieron agregar los créditos')
    await loadUsage(() => mounted.current)
  }

  return (
    <ModalShell labelledBy="ai-credits-title" className="max-w-md" onClose={onClose}>
      <form onSubmit={review} className="w-full max-w-md space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <h3 id="ai-credits-title" className="text-sm font-semibold text-gray-900 dark:text-white">Créditos de IA · {organizationName}</h3>
        <UsageSummary id={organizationId} state={usage} />
        <div>
          <label htmlFor="ai-credits-amount" className={LABEL}>Créditos *</label>
          <Input id="ai-credits-amount" type="number" inputMode="numeric" min={1} max={100000} value={credits} required
            hasError={Boolean(errors.credits)} data-testid={`admin-ai-credits-input-${organizationId}`}
            onChange={(event) => { setCredits(Number(event.target.value)); setConfirming(false) }} />
          {errors.credits && <p className={FIELD_ERROR}>{errors.credits}</p>}
          <div className="mt-2 flex gap-1.5">
            {QUICK_AMOUNTS.map((amount) => (
              <button key={amount} type="button" className={CHIP} data-testid={`admin-ai-credits-${amount}-${organizationId}`}
                onClick={() => { setCredits(amount); setConfirming(false) }}>
                +{fmt(amount)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="ai-credits-source" className={LABEL}>Origen *</label>
          <Combobox id="ai-credits-source" name="source" options={SOURCE_OPTIONS} defaultValue={source} required fieldError={errors.source}
            onChange={(value) => { if (isGrantSource(value)) { setSource(value); setConfirming(false) } }} />
        </div>
        <div>
          <label htmlFor="ai-credits-reference" className={LABEL}>Referencia{source === 'pack' ? ' *' : ''}</label>
          <Input id="ai-credits-reference" value={reference} maxLength={200} hasError={Boolean(errors.reference)}
            data-testid={`admin-ai-reference-${organizationId}`}
            onChange={(event) => { setReference(event.target.value); setConfirming(false) }} />
          {errors.reference && <p className={FIELD_ERROR}>{errors.reference}</p>}
        </div>
        {confirming && (
          <p role="status" data-testid={`admin-ai-confirm-text-${organizationId}`} className="rounded-md bg-orange-50 p-2 text-sm text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
            ¿Agregar {fmt(credits)} créditos ({SOURCE_LABELS[source]}) a {organizationName}? Esta acción queda registrada y no se puede deshacer.
          </p>
        )}
        {failure && <p role="alert" data-testid={`admin-ai-error-${organizationId}`} className="text-sm text-red-600">{failure}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={busy}>Cerrar</Button>
          {confirming ? (
            <Button type="button" className="flex-1" onClick={grant} disabled={busy} data-testid={`admin-ai-confirm-${organizationId}`}>
              {busy ? 'Agregando...' : 'Confirmar'}
            </Button>
          ) : (
            <Button type="submit" className="flex-1" data-testid={`admin-ai-grant-${organizationId}`}>Agregar créditos</Button>
          )}
        </div>
      </form>
    </ModalShell>
  )
}
