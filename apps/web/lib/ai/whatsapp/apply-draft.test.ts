import { describe, expect, it, vi } from 'vitest'
import type { QuoteFormItem } from '@/types/quote-form'
import { createQuoteSchema } from '@/lib/validations/cotizapro'
import { applyDraft, clientProposal, draftSummaryText, foundClientLabel, QUOTE_NOTES_MAX, type ApplyDraftDeps } from './apply-draft'
import type { ClientMatch } from './client-match'
import type { DraftResult } from './draft-result'
import type { DraftClient } from './types'

const BLANK: QuoteFormItem = { description: '', quantity: 1, unit_price: 0, unit_type: 'per_unit', service_id: null }
const ANA = { name: 'Ana', phone: null, email: null, zone: 'Cumbres' }
const MOSQUITERO = { concept: 'Mosquitero', quantity: 1, widthM: null, heightM: null, notes: null, serviceId: null, serviceName: null }

function draft(client: ClientMatch, items: DraftResult['items'] = [], zone: string | null = null): DraftResult {
  return { client, items, notes: null, zone }
}

interface HarnessOptions {
  readonly selectedClientId?: string
  readonly pendingClient?: DraftClient | null
}

function harness(items: readonly QuoteFormItem[], notes: string, options: HarnessOptions = {}) {
  const state = { items, notes }
  const deps: ApplyDraftDeps = {
    services: [],
    priceLists: [],
    currentItems: items,
    currentNotes: notes,
    selectedClientId: options.selectedClientId ?? '',
    pendingClient: options.pendingClient ?? null,
    setItems: (update) => { state.items = update(state.items) },
    setNotes: (update) => { state.notes = update(state.notes) },
    onExistingClient: vi.fn(),
    onNewClient: vi.fn(),
    onProposal: vi.fn(),
  }
  return { state, deps }
}

describe('applyDraft', () => {
  it('agrega partidas, notas y propone el cliente nuevo con sus datos', () => {
    const result = draft({ kind: 'new', client: ANA }, [MOSQUITERO], 'Cumbres')
    const { state, deps } = harness([BLANK], '')
    expect(applyDraft(result, deps)).toEqual({ added: 1, kept: 0, notesTruncated: false })
    expect(state.items).toHaveLength(1)
    expect(state.items[0]).toMatchObject({ description: 'Mosquitero', needs_catalog: true })
    expect(state.notes).toBe('Zona: Cumbres')
    expect(deps.onNewClient).toHaveBeenCalledWith(ANA)
    expect(deps.onProposal).toHaveBeenCalledWith({ kind: 'new', client: ANA, applied: true })
  })

  it('un mensaje sin datos deja el formulario igual', () => {
    const filled = { ...BLANK, description: 'Espejo', unit_price: 800 }
    const { state, deps } = harness([filled], 'Llamar antes')
    expect(applyDraft(draft({ kind: 'none' }), deps)).toEqual({ added: 0, kept: 1, notesTruncated: false })
    expect(state).toEqual({ items: [filled], notes: 'Llamar antes' })
    expect(deps.onExistingClient).not.toHaveBeenCalled()
    expect(deps.onNewClient).not.toHaveBeenCalled()
    expect(deps.onProposal).not.toHaveBeenCalled()
  })

  it('conserva las partidas que ya capturó la persona y agrega las nuevas al final', () => {
    const filled = { ...BLANK, description: 'Espejo de baño', unit_price: 800 }
    const { state, deps } = harness([filled, BLANK], 'Llamar antes')
    expect(applyDraft(draft({ kind: 'none' }, [MOSQUITERO], 'Cumbres'), deps)).toEqual({ added: 1, kept: 1, notesTruncated: false })
    expect(state.items.map((i) => i.description)).toEqual(['Espejo de baño', 'Mosquitero'])
    expect(state.notes).toBe('Llamar antes\nZona: Cumbres')
  })

  it('preselecciona el cliente existente', () => {
    const { deps } = harness([BLANK], '')
    applyDraft(draft({ kind: 'existing', clientId: 'c1', name: 'Laura', matchedBy: 'phone' }), deps)
    expect(deps.onExistingClient).toHaveBeenCalledWith({ clientId: 'c1', name: 'Laura' })
    expect(deps.onProposal).toHaveBeenCalledWith({ kind: 'found', clientId: 'c1', name: 'Laura', matchedBy: 'phone', applied: true })
  })

  it('no cambia el cliente que la persona ya eligió', () => {
    const { deps } = harness([BLANK], '', { selectedClientId: 'otro' })
    applyDraft(draft({ kind: 'existing', clientId: 'c1', name: 'Laura', matchedBy: 'name' }), deps)
    applyDraft(draft({ kind: 'new', client: ANA }), deps)
    expect(deps.onExistingClient).not.toHaveBeenCalled()
    expect(deps.onNewClient).not.toHaveBeenCalled()
    expect(deps.onProposal).toHaveBeenNthCalledWith(1, { kind: 'found', clientId: 'c1', name: 'Laura', matchedBy: 'name', applied: false })
    expect(deps.onProposal).toHaveBeenNthCalledWith(2, { kind: 'new', client: ANA, applied: false })
  })

  it('ambiguo: no preselecciona y ofrece los candidatos', () => {
    const { deps } = harness([BLANK], '')
    const candidates = [{ clientId: 'c1', name: 'Laura' }]
    applyDraft(draft({ kind: 'ambiguous', client: ANA, candidates }), deps)
    expect(deps.onExistingClient).not.toHaveBeenCalled()
    expect(deps.onNewClient).not.toHaveBeenCalled()
    expect(deps.onProposal).toHaveBeenCalledWith({ kind: 'choose', client: ANA, candidates })
  })
})

describe('clientProposal', () => {
  it('el mismo cliente ya elegido cuenta como aplicado', () => {
    expect(clientProposal({ kind: 'existing', clientId: 'c1', name: 'Laura', matchedBy: 'phone' }, 'c1', null)).toMatchObject({ applied: true })
  })

  it('sin cliente no propone nada', () => {
    expect(clientProposal({ kind: 'none' }, '', null)).toBeNull()
  })
})

describe('foundClientLabel', () => {
  it('dice cómo se encontró al cliente', () => {
    expect(foundClientLabel('phone', 'Laura Treviño')).toBe('Cliente encontrado por teléfono: Laura Treviño')
    expect(foundClientLabel('name', 'Laura Treviño')).toBe('Cliente encontrado por nombre: Laura Treviño')
  })
})

describe('draftSummaryText', () => {
  it('sin partidas avisa que no se tocaron las suyas', () => {
    expect(draftSummaryText({ added: 0, kept: 2, notesTruncated: false })).toBe('El mensaje no trae partidas reconocibles; tus partidas quedan igual.')
  })

  it('singular y plural', () => {
    expect(draftSummaryText({ added: 1, kept: 0, notesTruncated: false })).toBe('Se agregó 1 partida.')
    expect(draftSummaryText({ added: 2, kept: 0, notesTruncated: false })).toBe('Se agregaron 2 partidas.')
  })

  it('dice que conservó lo que ya estaba capturado', () => {
    expect(draftSummaryText({ added: 2, kept: 1, notesTruncated: false })).toBe('Se agregaron 2 partidas al final; se conservó la que ya tenías.')
    expect(draftSummaryText({ added: 1, kept: 3, notesTruncated: false })).toBe('Se agregó 1 partida al final; se conservaron las 3 que ya tenías.')
  })
})

describe('un cliente nuevo pendiente cuenta como cliente elegido', () => {
  const LAURA = { name: 'Laura Treviño', phone: '8123456789', email: null, zone: 'San Nicolás' }

  it('otro mensaje con otro cliente nuevo no reemplaza al pendiente: lo ofrece', () => {
    const { deps } = harness([BLANK], '', { pendingClient: LAURA })
    applyDraft(draft({ kind: 'new', client: ANA }), deps)
    expect(deps.onNewClient).not.toHaveBeenCalled()
    expect(deps.onProposal).toHaveBeenCalledWith({ kind: 'new', client: ANA, applied: false })
  })

  it('un cliente existente tampoco reemplaza al pendiente', () => {
    const { deps } = harness([BLANK], '', { pendingClient: LAURA })
    applyDraft(draft({ kind: 'existing', clientId: 'c1', name: 'Laura', matchedBy: 'phone' }), deps)
    expect(deps.onExistingClient).not.toHaveBeenCalled()
    expect(deps.onProposal).toHaveBeenCalledWith({ kind: 'found', clientId: 'c1', name: 'Laura', matchedBy: 'phone', applied: false })
  })

  it('el mismo cliente nuevo otra vez se queda como está', () => {
    expect(clientProposal({ kind: 'new', client: { ...LAURA } }, '', LAURA)).toEqual({ kind: 'new', client: LAURA, applied: true })
  })
})

describe('notas del borrador con el tope del servidor', () => {
  const longDraft = (notes: string): DraftResult => ({ client: { kind: 'none' }, items: [], notes, zone: null })

  it('recorta el final a 2,000 caracteres y lo avisa; lo de la persona queda primero', () => {
    const own = 'Llamar antes. '.repeat(100).trim()
    const { state, deps } = harness([BLANK], own)
    const summary = applyDraft(longDraft('x'.repeat(1500)), deps)
    expect(summary.notesTruncated).toBe(true)
    expect(state.notes).toHaveLength(QUOTE_NOTES_MAX)
    expect(state.notes.startsWith(own)).toBe(true)
    expect(createQuoteSchema.shape.notes.safeParse(state.notes).success).toBe(true)
  })

  it('no parte un par sustituto (p. ej. un emoji) al recortar', () => {
    const { state, deps } = harness([BLANK], 'a'.repeat(QUOTE_NOTES_MAX - 2))
    applyDraft(longDraft('\uD83D\uDE00\uD83D\uDE00'), deps)
    expect(state.notes.length).toBeLessThanOrEqual(QUOTE_NOTES_MAX)
    expect(state.notes.endsWith('\uD83D')).toBe(false)
  })

  it('notas cortas no se recortan', () => {
    const { state, deps } = harness([BLANK], 'Llamar antes')
    expect(applyDraft(longDraft('Quiere el sábado'), deps).notesTruncated).toBe(false)
    expect(state.notes).toBe('Llamar antes\nQuiere el sábado')
  })

  it('el resumen avisa del recorte', () => {
    expect(draftSummaryText({ added: 0, kept: 1, notesTruncated: true })).toBe(
      'El mensaje no trae partidas reconocibles; tus partidas quedan igual. Las notas pasaban de 2,000 caracteres: se recortó el final.',
    )
  })
})
