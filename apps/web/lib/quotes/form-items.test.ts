import { describe, expect, it } from 'vitest'
import { createQuoteSchema, quoteItemSchema } from '@/lib/validations/cotizapro'
import type { QuoteFormItem } from '@/types/quote-form'
import { buildQuotePayload, editQuoteItem, firstItemProblem, itemAttention, toQuoteItemPayload } from './form-items'

const SERVICE_ID = '00000000-0000-0000-00c0-000000000201'
const CLIENT_ID = '00000000-0000-0000-00c0-000000000301'
const REVIEW_REASON = 'Revisar: faltan medidas (cantidad en piezas, el precio es por m²)'

const PRICED: QuoteFormItem = { description: 'Espejo', quantity: 1, unit_price: 800, unit_type: 'per_unit', service_id: null }
const FLAGGED: QuoteFormItem = {
  description: 'Cancel de baño templado',
  quantity: 2,
  unit_price: 1150,
  unit_type: 'per_sqm',
  service_id: SERVICE_ID,
  input: null,
  needs_catalog: false,
  needs_review: true,
  review_reason: REVIEW_REASON,
}
const UNPRICED: QuoteFormItem = { description: 'Mosquitero', quantity: 2, unit_price: 0, unit_type: 'per_unit', service_id: null, input: null, needs_catalog: true }
const CONFIGURABLE: QuoteFormItem = { description: 'Cancel', quantity: 1, unit_price: 0, unit_type: 'fixed', service_id: SERVICE_ID, input: { ancho: 900 } }

const PAYLOAD_KEYS = ['description', 'input', 'quantity', 'service_id', 'unit_price', 'unit_type']

describe('toQuoteItemPayload', () => {
  it('quita las marcas del navegador y cumple quoteItemSchema estricto', () => {
    const payload = toQuoteItemPayload({ ...FLAGGED, needs_review: false })
    expect(Object.keys(payload).sort()).toEqual(PAYLOAD_KEYS)
    expect(payload).not.toHaveProperty('needs_catalog')
    expect(payload).not.toHaveProperty('needs_review')
    expect(payload).not.toHaveProperty('review_reason')
    expect(quoteItemSchema.strict().safeParse(payload).success).toBe(true)
  })

  it('el servicio "Libre" ("") se manda como null', () => {
    expect(toQuoteItemPayload({ ...PRICED, service_id: '' }).service_id).toBeNull()
  })

  it('conserva las entradas del producto configurable', () => {
    expect(toQuoteItemPayload({ ...CONFIGURABLE, unit_price: 2000 }).input).toEqual({ ancho: 900 })
  })
})

describe('buildQuotePayload', () => {
  const now = new Date('2026-10-14T12:00:00.000Z')
  const payload = buildQuotePayload({
    clientId: CLIENT_ID,
    items: [{ ...UNPRICED, unit_price: 450 }, blankItem(), { ...FLAGGED, needs_review: false }],
    notes: '',
    terms: 'Anticipo 50 %',
    validDays: 30,
    discountRate: 0,
    customFields: {},
    now,
  })

  it('es exactamente lo que espera createQuoteSchema', () => {
    const strict = createQuoteSchema.extend({ items: quoteItemSchema.strict().array().min(1) }).strict()
    expect(strict.safeParse(payload).success).toBe(true)
  })

  it('omite partidas vacías, manda notas vacías como null y calcula la vigencia', () => {
    expect(payload.items).toHaveLength(2)
    expect(payload.notes).toBeNull()
    expect(payload.valid_until).toBe('2026-11-13T12:00:00.000Z')
    expect(JSON.stringify(payload)).not.toMatch(/needs_|review_reason/)
  })
})

function blankItem(): QuoteFormItem {
  return { description: '', quantity: 1, unit_price: 0, unit_type: 'per_unit', service_id: null }
}

describe('editQuoteItem', () => {
  it.each(['quantity', 'unit_price', 'unit_type', 'service_id'] as const)('editar %s quita la marca de revisión', (field) => {
    const value = field === 'quantity' || field === 'unit_price' ? 3 : field === 'unit_type' ? 'fixed' : SERVICE_ID
    const edited = editQuoteItem(FLAGGED, field, value)
    expect(edited[field]).toBe(value)
    expect(edited.needs_review).toBe(false)
    expect(edited).not.toHaveProperty('review_reason')
  })

  it('editar las medidas (input) quita la marca de revisión', () => {
    expect(editQuoteItem(FLAGGED, 'input', { ancho: 900, alto: 1800 }).needs_review).toBe(false)
  })

  it('editar solo la descripción no quita la marca', () => {
    const edited = editQuoteItem(FLAGGED, 'description', 'Cancel corredizo')
    expect(edited).toMatchObject({ description: 'Cancel corredizo', needs_review: true, review_reason: REVIEW_REASON })
  })

  it('no modifica la partida original', () => {
    editQuoteItem(FLAGGED, 'quantity', 5)
    expect(FLAGGED).toMatchObject({ quantity: 2, needs_review: true })
  })
})

describe('itemAttention', () => {
  it('sin precio del catálogo', () => {
    expect(itemAttention(UNPRICED)).toEqual({ kind: 'catalog', text: 'Sin precio: elige del catálogo' })
  })

  it('con precio escrito a mano ya no pide catálogo', () => {
    expect(itemAttention({ ...UNPRICED, unit_price: 450 })).toBeNull()
  })

  it('revisión con el motivo en español', () => {
    expect(itemAttention(FLAGGED)).toEqual({ kind: 'review', text: 'Revisar: faltan medidas (cantidad en piezas, el precio es por m²)' })
    expect(itemAttention({ ...FLAGGED, review_reason: 'El precio del catálogo no es válido' })).toEqual({ kind: 'review', text: 'Revisar: El precio del catálogo no es válido' })
  })

  it('una partida normal no tiene aviso', () => {
    expect(itemAttention(PRICED)).toBeNull()
  })
})

describe('firstItemProblem', () => {
  it('sin problemas regresa null', () => {
    expect(firstItemProblem([PRICED])).toBeNull()
  })

  it('partida sin precio', () => {
    expect(firstItemProblem([PRICED, UNPRICED])).toEqual({ index: 1, message: 'La partida 2 no tiene precio: elígela del catálogo' })
  })

  it('partida por revisar', () => {
    expect(firstItemProblem([FLAGGED])).toEqual({ index: 0, message: 'Revisa la partida 1: faltan medidas (cantidad en piezas, el precio es por m²)' })
  })

  it('configurable incompleto', () => {
    expect(firstItemProblem([PRICED, CONFIGURABLE])).toEqual({ index: 1, message: 'Completa las medidas y opciones de la partida 2' })
  })

  it('regresa la primera partida con problema, en orden', () => {
    expect(firstItemProblem([PRICED, UNPRICED, CONFIGURABLE])?.index).toBe(1)
    expect(firstItemProblem([CONFIGURABLE, UNPRICED])?.index).toBe(0)
  })

  it('al corregir la partida deja de bloquear', () => {
    const fixed = editQuoteItem(FLAGGED, 'quantity', 4.5)
    expect(firstItemProblem([fixed])).toBeNull()
  })
})

describe('editQuoteItem al elegir "Libre"', () => {
  it('quitar el servicio de una partida configurable borra sus entradas', () => {
    const edited = editQuoteItem({ ...CONFIGURABLE, unit_price: 2000 }, 'service_id', '')
    expect(edited.service_id).toBe('')
    expect(edited.input).toBeNull()
    expect(toQuoteItemPayload(edited)).toMatchObject({ service_id: null, input: null })
  })

  it('cambiar a otro servicio no toca las entradas aquí (las pone selectService)', () => {
    expect(editQuoteItem(CONFIGURABLE, 'service_id', SERVICE_ID).input).toEqual({ ancho: 900 })
  })
})
