import { describe, expect, it, vi } from 'vitest'
import { createClientSchema } from '@/lib/validations/cotizapro'
import { createDraftClient, draftClientPayload } from './create-client'

const LAURA = { name: 'Laura Treviño', phone: '8123456789', email: null, zone: 'San Nicolás' }

describe('cliente nuevo desde el borrador', () => {
  it('usa el teléfono también como WhatsApp y la zona como dirección', () => {
    expect(draftClientPayload(LAURA)).toEqual({ name: 'Laura Treviño', phone: '8123456789', whatsapp_phone: '8123456789', email: null, address: 'San Nicolás' })
  })

  it('el cuerpo cumple createClientSchema', () => {
    expect(createClientSchema.safeParse(draftClientPayload(LAURA)).success).toBe(true)
  })

  it('crea el cliente y regresa su id', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ client: { id: '00000000-0000-0000-00c0-000000000777', name: 'Laura Treviño' } }, { status: 201 }))
    await expect(createDraftClient(LAURA, fetchImpl)).resolves.toEqual({ id: '00000000-0000-0000-00c0-000000000777', name: 'Laura Treviño' })
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('/api/clients')
    expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe('POST')
  })

  it('muestra el error del servidor si no se pudo crear', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json({ error: 'Por favor verifica los datos ingresados.' }, { status: 400 }))
    await expect(createDraftClient(LAURA, fetchImpl)).rejects.toThrow('Por favor verifica los datos ingresados.')
  })

  it('una respuesta ilegible da un error genérico', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response('<html>', { status: 500 }))
    await expect(createDraftClient(LAURA, fetchImpl)).rejects.toThrow('No se pudo crear el cliente')
  })

  it('sin nombre no intenta crear', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
    await expect(createDraftClient({ ...LAURA, name: null }, fetchImpl)).rejects.toThrow('El cliente no tiene nombre')
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
