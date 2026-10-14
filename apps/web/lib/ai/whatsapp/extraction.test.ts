import { describe, expect, it } from 'vitest'
import { normalizeExtraction, rawExtractionSchema } from './extraction'

const RAW = {
  cliente: { nombre: '  Laura Treviño ', telefono: '+52 81 2345 6789', correo: 'no-es-correo', zona: 'San Nicolás' },
  partidas: [
    { concepto: 'Cancel de baño templado 9 mm', cantidad: 1, ancho: '90', alto: '1.80', notas: 'corredizo', precio: 1 },
    { concepto: '   ', cantidad: 1, ancho: null, alto: null, notas: null },
    { concepto: 'Mosquitero de fibra', cantidad: 'dos', ancho: '120', alto: '150 cm', notas: null },
  ],
  notas: 'Quiere instalación el sábado',
  total: 99,
}

describe('extracción del mensaje', () => {
  it('el esquema descarta cualquier precio que mande el modelo', () => {
    const parsed = rawExtractionSchema.parse(RAW)
    expect(parsed.partidas[0]).not.toHaveProperty('precio')
    expect(parsed).not.toHaveProperty('total')
  })

  it('normaliza cliente, partidas y medidas', () => {
    expect(normalizeExtraction(rawExtractionSchema.parse(RAW))).toEqual({
      client: { name: 'Laura Treviño', phone: '8123456789', email: null, zone: 'San Nicolás' },
      items: [
        { concept: 'Cancel de baño templado 9 mm', quantity: 1, widthM: 0.9, heightM: 1.8, notes: 'corredizo' },
        { concept: 'Mosquitero de fibra', quantity: 2, widthM: 1.2, heightM: 1.5, notes: null },
      ],
      notes: 'Quiere instalación el sábado',
    })
  })

  it('un mensaje sin datos útiles queda vacío', () => {
    expect(normalizeExtraction(rawExtractionSchema.parse({ cliente: null, partidas: [], notas: null }))).toEqual({
      client: { name: null, phone: null, email: null, zone: null },
      items: [],
      notes: null,
    })
  })

  it('acepta a lo más 15 partidas y teléfonos que no son de 10 dígitos quedan vacíos', () => {
    const many = { cliente: { telefono: '12345' }, partidas: Array.from({ length: 20 }, (_, i) => ({ concepto: `Vidrio ${i}` })) }
    const result = normalizeExtraction(rawExtractionSchema.parse(many))
    expect(result.items).toHaveLength(15)
    expect(result.client.phone).toBeNull()
  })

  it('tolera partidas nulas, teléfono numérico y correo válido', () => {
    const result = normalizeExtraction(
      rawExtractionSchema.parse({ cliente: { telefono: 8123456789, correo: 'laura@correo.mx' }, partidas: null }),
    )
    expect(result.items).toEqual([])
    expect(result.client.phone).toBe('8123456789')
    expect(result.client.email).toBe('laura@correo.mx')
  })

  it('cantidades y medidas raras nunca producen NaN ni negativos', () => {
    const result = normalizeExtraction(
      rawExtractionSchema.parse({
        partidas: [
          { concepto: 'Minisplit', cantidad: 'tres minisplits', ancho: '3x2', alto: '-4' },
          { concepto: 'Vidrio', cantidad: '-2', ancho: '1.5 m2', alto: 'x' },
        ],
      }),
    )
    expect(result.items.map((i) => i.quantity)).toEqual([3, 1])
    for (const item of result.items) {
      expect(item.widthM).toBeNull()
      expect(item.heightM).toBeNull()
    }
  })

  it('recorta textos largos', () => {
    const result = normalizeExtraction(rawExtractionSchema.parse({ notas: 'a'.repeat(900), partidas: [{ concepto: 'b'.repeat(300) }] }))
    expect(result.notes).toHaveLength(500)
    expect(result.items[0]?.concept).toHaveLength(120)
  })
})

describe('ronda 1 de correcciones', () => {
  const run = (cliente: object | null, partidas: object[] = [], notas: string | null = null) =>
    normalizeExtraction(rawExtractionSchema.parse({ cliente, partidas, notas }))

  it('el recorte no deja sustitutos sueltos y quita caracteres invisibles', () => {
    const result = run(null, [{ concepto: 'a' + '😀'.repeat(200) }])
    const concept = result.items[0]?.concept ?? ''
    const last = concept.charCodeAt(concept.length - 1)
    expect(last >= 0xd800 && last <= 0xdbff).toBe(false)
    const dirty = run(null, [{ concepto: 'Vi\u0000dri\u200Bo\u0007' }], 'no\u0000ta\u200B')
    expect(dirty.items[0]?.concept).toBe('Vidrio')
    expect(dirty.notes).toBe('nota')
  })

  it('el teléfono exige 10 dígitos, o 52 / 521 más 10', () => {
    const phone = (telefono: string | number) => run({ telefono }).client.phone
    expect(phone('81 2345 6789 ext 12')).toBeNull()
    expect(phone(8123456789.5)).toBeNull()
    expect(phone('+52 1 81 2345 6789')).toBe('8123456789')
    expect(phone('(81) 2345-6789')).toBe('8123456789')
    expect(phone('+52 81 2345 6789')).toBe('8123456789')
    expect(phone(8123456789)).toBe('8123456789')
    expect(phone('81234567890')).toBeNull()
    expect(phone('tel 8123456789')).toBeNull()
    expect(phone('+1 81 2345 6789')).toBeNull()
  })

  it('lo que no se entendió se avisa en las notas de la partida', () => {
    const [item] = run(null, [{ concepto: 'Cancel', cantidad: 'varios', ancho: '1.5 m2', alto: '2 m', notas: 'corredizo' }]).items
    expect(item?.quantity).toBe(1)
    expect(item?.widthM).toBeNull()
    expect(item?.notes).toBe('corredizo; Revisar: cantidad «varios»; Revisar: medida «1.5 m2»')
    const clean = run(null, [{ concepto: 'Cancel', cantidad: '', ancho: null, alto: '' }]).items[0]
    expect(clean?.notes).toBeNull()
    const long = run(null, [{ concepto: 'Cancel', cantidad: 'x'.repeat(500), notas: 'n'.repeat(500) }]).items[0]
    expect(long?.notes?.length).toBeLessThanOrEqual(200)
    expect(long?.notes).toContain('Revisar: cantidad')
  })
})
