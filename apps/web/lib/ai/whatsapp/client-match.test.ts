import { describe, expect, it } from 'vitest'
import { matchClient } from './client-match'

const CLIENTS = [
  { id: 'c1', name: 'Laura Treviño', phone: null, whatsapp_phone: '+52 1 81 2345 6789' },
  { id: 'c2', name: 'Roberto Garza', phone: '81 9999 0000', whatsapp_phone: null },
]
const draft = { name: null, phone: null, email: null, zone: null }

describe('matchClient', () => {
  it('encuentra por teléfono aunque cambie el formato', () => {
    expect(matchClient({ ...draft, name: 'Laura', phone: '8123456789' }, CLIENTS)).toEqual({ kind: 'existing', clientId: 'c1', name: 'Laura Treviño', matchedBy: 'phone' })
    expect(matchClient({ ...draft, phone: '8123456789' }, CLIENTS)).toEqual({ kind: 'existing', clientId: 'c1', name: 'Laura Treviño', matchedBy: 'phone' })
  })

  it('luego por nombre exacto sin acentos', () => {
    expect(matchClient({ ...draft, name: 'laura trevino' }, CLIENTS)).toEqual({ kind: 'existing', clientId: 'c1', name: 'Laura Treviño', matchedBy: 'name' })
  })

  it('si no existe propone uno nuevo y si no hay datos no propone nada', () => {
    const fresh = { ...draft, name: 'Ana Pérez', zone: 'Cumbres' }
    expect(matchClient(fresh, CLIENTS)).toEqual({ kind: 'new', client: fresh })
    expect(matchClient(draft, CLIENTS)).toEqual({ kind: 'none' })
  })

  it('solo compara teléfonos de exactamente 10 dígitos', () => {
    const short = [{ id: 'c3', name: 'Corto', phone: '12345', whatsapp_phone: null }]
    expect(matchClient({ ...draft, phone: '12345' }, short)).toEqual({ kind: 'none' })
    expect(matchClient({ ...draft, name: 'Ana', phone: '12345' }, short)).toEqual({ kind: 'new', client: { ...draft, name: 'Ana', phone: '12345' } })
    expect(matchClient({ ...draft, phone: '' }, [{ id: 'c4', name: 'Sin teléfono', phone: '', whatsapp_phone: null }])).toEqual({ kind: 'none' })
  })

  it('un teléfono único gana aunque el nombre coincida con otro cliente', () => {
    const clients = [...CLIENTS, { id: 'c5', name: 'Roberto Garza', phone: '81 1111 2222', whatsapp_phone: null }]
    expect(matchClient({ ...draft, name: 'Roberto Garza', phone: '8111112222' }, clients)).toEqual({ kind: 'existing', clientId: 'c5', name: 'Roberto Garza', matchedBy: 'phone' })
  })

  it('teléfono de un cliente cuyo nombre no comparte ninguna palabra: lo confirma el dueño', () => {
    const input = { ...draft, name: 'Pedro Salinas', phone: '8123456789' }
    expect(matchClient(input, CLIENTS)).toEqual({ kind: 'ambiguous', client: input, candidates: [{ clientId: 'c1', name: 'Laura Treviño' }] })
    const nickname = { ...draft, name: 'Lau', phone: '8123456789' }
    expect(matchClient(nickname, CLIENTS).kind).toBe('ambiguous')
  })

  it('las partículas del nombre (de, la, del) no cuentan como palabra compartida', () => {
    const clients = [{ id: 'c8', name: 'María de la Garza', phone: '8100000001', whatsapp_phone: null }]
    const input = { ...draft, name: 'Pedro de la Fuente', phone: '8100000001' }
    expect(matchClient(input, clients).kind).toBe('ambiguous')
  })

  it('dos clientes con el mismo teléfono no se ligan solos: regresa los candidatos', () => {
    const clients = [...CLIENTS, { id: 'c6', name: 'Laura T. (oficina)', phone: '8123456789', whatsapp_phone: null }]
    const input = { ...draft, name: 'Laura', phone: '8123456789' }
    expect(matchClient(input, clients)).toEqual({
      kind: 'ambiguous',
      client: input,
      candidates: [
        { clientId: 'c1', name: 'Laura Treviño' },
        { clientId: 'c6', name: 'Laura T. (oficina)' },
      ],
    })
  })

  it('varios con el mismo teléfono y solo uno con el nombre exacto: se liga ese por teléfono', () => {
    const clients = [...CLIENTS, { id: 'c6', name: 'Laura T. (oficina)', phone: '8123456789', whatsapp_phone: null }]
    expect(matchClient({ ...draft, name: 'LAURA TREVINO', phone: '8123456789' }, clients)).toEqual({ kind: 'existing', clientId: 'c1', name: 'Laura Treviño', matchedBy: 'phone' })
  })

  it('dos clientes con el mismo nombre no se ligan solos: regresa los candidatos', () => {
    const clients = [...CLIENTS, { id: 'c7', name: 'LAURA TREVIÑO', phone: '81 0000 0001', whatsapp_phone: null }]
    const input = { ...draft, name: 'Laura Trevino' }
    const result = matchClient(input, clients)
    expect(result.kind).toBe('ambiguous')
    expect(result.kind === 'ambiguous' ? result.candidates.map((c) => c.clientId) : []).toEqual(['c1', 'c7'])
  })

  it('un nombre de una sola palabra no se liga solo aunque haya un único cliente así', () => {
    const clients = [{ id: 'c9', name: 'Laura', phone: null, whatsapp_phone: null }]
    const input = { ...draft, name: 'laura' }
    expect(matchClient(input, clients)).toEqual({ kind: 'ambiguous', client: input, candidates: [{ clientId: 'c9', name: 'Laura' }] })
  })

  it('acota la lista de candidatos', () => {
    const clients = Array.from({ length: 12 }, (_, i) => ({ id: `d${i}`, name: 'Juan López', phone: null, whatsapp_phone: null }))
    const result = matchClient({ ...draft, name: 'juan lopez' }, clients)
    expect(result.kind === 'ambiguous' ? result.candidates : []).toHaveLength(5)
  })
})
