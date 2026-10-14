import { describe, expect, it, vi } from 'vitest'
import { parseDueNotices, runBillingNotices, type NoticeDeps } from './notices'
import type { DueNotice } from './types'

const now = new Date('2026-10-13T15:00:00.000Z')
const notice: DueNotice = {
  organizationId: '00000000-0000-0000-00c0-000000000003',
  organizationName: 'Plomería Don Beto',
  planId: 'pro',
  periodEnd: '2026-10-16T14:00:00.123456+00:00',
  ownerEmail: 'beto@example.test',
  ownerName: 'Beto Ramírez',
  sentKinds: [],
}

function deps(overrides: Partial<NoticeDeps> = {}): NoticeDeps {
  return {
    now,
    renewUrl: 'https://cotizapro.example/dashboard/billing',
    claim: vi.fn().mockResolvedValue(true),
    release: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

describe('runBillingNotices', () => {
  it('manda el aviso de 3 días una vez y lo reclama con su cubo', async () => {
    const d = deps()
    expect(await runBillingNotices([notice], d)).toEqual({ considered: 1, sent: 1, skipped: 0, failed: 0 })
    expect(d.claim).toHaveBeenCalledWith(notice, 'd3')
    expect(d.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'beto@example.test', subject: 'Tu plan Taller de CotizaPro vence en 3 días' }))
  })

  it('no reclama un aviso que ya se envió en este periodo', async () => {
    const d = deps()
    expect(await runBillingNotices([{ ...notice, sentKinds: ['d3'] }], d)).toMatchObject({ sent: 0, skipped: 1 })
    expect(d.claim).not.toHaveBeenCalled()
  })

  it('si otra corrida ya lo reclamó, no lo manda', async () => {
    const d = deps({ claim: vi.fn().mockResolvedValue(false) })
    expect(await runBillingNotices([notice], d)).toMatchObject({ sent: 0, skipped: 1 })
    expect(d.send).not.toHaveBeenCalled()
  })

  it('libera el reclamo cuando el correo falla, para reintentar en la siguiente corrida', async () => {
    const d = deps({ send: vi.fn().mockResolvedValue(false) })
    expect(await runBillingNotices([notice], d)).toMatchObject({ sent: 0, failed: 1 })
    expect(d.release).toHaveBeenCalledWith(notice, 'd3')
  })

  it('omite cuentas sin correo del propietario o con más de 7 días', async () => {
    const summary = await runBillingNotices([{ ...notice, ownerEmail: null }, { ...notice, periodEnd: '2026-10-25T15:00:00Z' }], deps())
    expect(summary).toEqual({ considered: 2, sent: 0, skipped: 2, failed: 0 })
  })

  it('manda el aviso del día del vencimiento a una cuenta ya vencida', async () => {
    const d = deps()
    await runBillingNotices([{ ...notice, periodEnd: '2026-10-13T10:00:00Z' }], d)
    expect(d.claim).toHaveBeenCalledWith(expect.objectContaining({ organizationId: notice.organizationId }), 'd0')
    expect(d.send).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Tu plan Taller de CotizaPro venció' }))
  })
})

describe('parseDueNotices', () => {
  it('convierte filas de la RPC y descarta las inválidas', () => {
    const rows = parseDueNotices([
      { organization_id: 'a', organization_name: 'A', plan: 'pro', current_period_end: '2026-10-16T14:00:00+00:00', owner_email: 'a@x.test', owner_name: null, sent_kinds: ['d7'] },
      { organization_id: 'b', organization_name: 'B', plan: 'free', current_period_end: '2026-10-16T14:00:00+00:00', owner_email: null, owner_name: null, sent_kinds: [] },
    ])
    expect(rows).toEqual([
      { organizationId: 'a', organizationName: 'A', planId: 'pro', periodEnd: '2026-10-16T14:00:00+00:00', ownerEmail: 'a@x.test', ownerName: null, sentKinds: ['d7'] },
    ])
    expect(parseDueNotices(null)).toEqual([])
  })

  it('descarta planes desconocidos y conserva el texto del vencimiento sin cambios', () => {
    const periodEnd = '2026-10-16T14:00:00.123456+00:00'
    const rows = parseDueNotices([
      { organization_id: 'c', organization_name: 'C', plan: 'legacy', current_period_end: periodEnd, owner_email: 'c@x.test', owner_name: null, sent_kinds: null },
      { organization_id: 'd', organization_name: 'D', plan: 'enterprise', current_period_end: periodEnd, owner_email: 'd@x.test', owner_name: 'Dora', sent_kinds: null },
    ])
    expect(rows).toEqual([
      { organizationId: 'd', organizationName: 'D', planId: 'enterprise', periodEnd, ownerEmail: 'd@x.test', ownerName: 'Dora', sentKinds: [] },
    ])
  })
})

describe('runBillingNotices con errores inesperados', () => {
  it('un aviso que truena no frena a los demás', async () => {
    const now = new Date('2026-10-13T15:00:00Z')
    const notice = (id: string): DueNotice => ({
      organizationId: id,
      organizationName: 'Taller',
      planId: 'pro',
      periodEnd: '2026-10-16T15:00:00Z',
      ownerEmail: 'dueno@demo.cotizapro.mx',
      ownerName: null,
      sentKinds: [],
    })
    let calls = 0
    const summary = await runBillingNotices([notice('a'), notice('b')], {
      now,
      renewUrl: 'https://cotizapro.test/dashboard/billing',
      claim: async () => {
        calls += 1
        if (calls === 1) throw new Error('boom')
        return true
      },
      send: async () => true,
      release: async () => undefined,
    })
    expect(summary).toEqual({ considered: 2, sent: 1, skipped: 0, failed: 1 })
  })
})
